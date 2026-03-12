"""Tests for Cognito JWT verification and dual-mode admin auth."""

import json
import time
from unittest.mock import AsyncMock, MagicMock, patch

import jwt as pyjwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from httpx import ASGITransport, AsyncClient

from src.app.dependencies import get_db_api
from src.app.main import create_app
from src.app.services.cognito import CognitoJWTVerifier
from src.app.services.db_functions import DatabaseAPI

# ── Helpers ──────────────────────────────────────────────────────────────────


def _generate_rsa_keypair():
    """Generate an RSA key pair for test token signing."""
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    return private_key


def _make_jwks(private_key, kid="test-kid"):
    """Build a JWKS dict from an RSA private key."""
    from jwt.algorithms import RSAAlgorithm

    public_key = private_key.public_key()
    jwk = json.loads(RSAAlgorithm.to_jwk(public_key))
    jwk["kid"] = kid
    jwk["use"] = "sig"
    jwk["alg"] = "RS256"
    return {"keys": [jwk]}


def _sign_token(private_key, claims, kid="test-kid"):
    """Sign a JWT with the given RSA private key."""
    return pyjwt.encode(claims, private_key, algorithm="RS256", headers={"kid": kid})


# ── CognitoJWTVerifier tests ────────────────────────────────────────────────


class TestCognitoJWTVerifier:
    """Unit tests for CognitoJWTVerifier with mocked JWKS endpoint."""

    def setup_method(self):
        self.private_key = _generate_rsa_keypair()
        self.jwks = _make_jwks(self.private_key)
        self.verifier = CognitoJWTVerifier(
            region="us-east-1",
            user_pool_id="us-east-1_TestPool",
            app_client_id="test-client-id",
        )

    def _valid_claims(self):
        return {
            "sub": "user-123",
            "email": "admin@example.com",
            "iss": "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_TestPool",
            "aud": "test-client-id",
            "token_use": "id",
            "exp": int(time.time()) + 3600,
            "iat": int(time.time()),
        }

    @patch("src.app.services.cognito.urllib.request.urlopen")
    def test_verify_valid_token(self, mock_urlopen):
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps(self.jwks).encode()
        mock_response.__enter__ = lambda s: s
        mock_response.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = mock_response

        token = _sign_token(self.private_key, self._valid_claims())
        claims = self.verifier.verify_token(token)
        assert claims["sub"] == "user-123"
        assert claims["email"] == "admin@example.com"

    @patch("src.app.services.cognito.urllib.request.urlopen")
    def test_reject_expired_token(self, mock_urlopen):
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps(self.jwks).encode()
        mock_response.__enter__ = lambda s: s
        mock_response.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = mock_response

        claims = self._valid_claims()
        claims["exp"] = int(time.time()) - 3600
        token = _sign_token(self.private_key, claims)

        with pytest.raises(pyjwt.ExpiredSignatureError):
            self.verifier.verify_token(token)

    @patch("src.app.services.cognito.urllib.request.urlopen")
    def test_reject_wrong_audience(self, mock_urlopen):
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps(self.jwks).encode()
        mock_response.__enter__ = lambda s: s
        mock_response.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = mock_response

        claims = self._valid_claims()
        claims["aud"] = "wrong-client-id"
        token = _sign_token(self.private_key, claims)

        with pytest.raises(pyjwt.InvalidAudienceError):
            self.verifier.verify_token(token)

    @patch("src.app.services.cognito.urllib.request.urlopen")
    def test_reject_wrong_issuer(self, mock_urlopen):
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps(self.jwks).encode()
        mock_response.__enter__ = lambda s: s
        mock_response.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = mock_response

        claims = self._valid_claims()
        claims["iss"] = "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_Wrong"
        token = _sign_token(self.private_key, claims)

        with pytest.raises(pyjwt.InvalidIssuerError):
            self.verifier.verify_token(token)

    def test_reject_token_without_kid(self):
        token = pyjwt.encode(self._valid_claims(), self.private_key, algorithm="RS256", headers={})
        with pytest.raises(pyjwt.InvalidTokenError, match="missing kid"):
            self.verifier.verify_token(token)

    @patch("src.app.services.cognito.urllib.request.urlopen")
    def test_reject_unknown_kid(self, mock_urlopen):
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps(self.jwks).encode()
        mock_response.__enter__ = lambda s: s
        mock_response.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = mock_response

        token = _sign_token(self.private_key, self._valid_claims(), kid="unknown-kid")
        with pytest.raises(pyjwt.InvalidTokenError, match="Public key not found"):
            self.verifier.verify_token(token)


# ── Dual-mode auth dependency tests ─────────────────────────────────────────


class TestDualModeAuth:
    """Test get_admin_auth falls back to API key when Cognito is not configured."""

    @pytest.fixture
    def mock_db_api(self):
        mock = AsyncMock(spec=DatabaseAPI)
        mock.upsert_professional_entry.return_value = {"success": True}
        return mock

    @pytest.fixture
    async def api_key_client(self, mock_db_api):
        """Client for API key auth mode (no Cognito configured)."""
        app = create_app()
        app.dependency_overrides[get_db_api] = lambda: mock_db_api
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
            yield ac
        app.dependency_overrides.clear()

    async def test_api_key_fallback_valid(self, api_key_client):
        """Valid API key succeeds when Cognito is not configured."""
        response = await api_key_client.post(
            "/api/admin/resume/entry",
            json={
                "entry_type": "work",
                "title": "Test",
                "organization": "Acme",
                "start_date": "2024-01-01",
            },
            headers={"X-Admin-Key": "local-dev-admin-key"},
        )
        assert response.status_code == 200

    async def test_api_key_fallback_invalid(self, api_key_client):
        """Invalid API key returns 401 when Cognito is not configured."""
        response = await api_key_client.post(
            "/api/admin/resume/entry",
            json={
                "entry_type": "work",
                "title": "Test",
                "organization": "Acme",
                "start_date": "2024-01-01",
            },
            headers={"X-Admin-Key": "wrong-key"},
        )
        assert response.status_code == 401

    async def test_no_auth_header_returns_401(self, api_key_client):
        """Missing auth header returns 401."""
        response = await api_key_client.post(
            "/api/admin/resume/entry",
            json={
                "entry_type": "work",
                "title": "Test",
                "organization": "Acme",
                "start_date": "2024-01-01",
            },
        )
        assert response.status_code == 401
