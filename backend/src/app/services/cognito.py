"""Cognito JWT token verification for admin authentication."""

import json
import urllib.request

import jwt
from jwt.algorithms import RSAAlgorithm


class CognitoJWTVerifier:
    """Verifies Cognito-issued JWT tokens using the user pool's JWKS."""

    def __init__(self, region: str, user_pool_id: str, app_client_id: str) -> None:
        self.region = region
        self.user_pool_id = user_pool_id
        self.app_client_id = app_client_id
        self.issuer = f"https://cognito-idp.{region}.amazonaws.com/{user_pool_id}"
        self.jwks_url = f"{self.issuer}/.well-known/jwks.json"
        self._jwks: dict[str, dict] = {}

    def _fetch_jwks(self) -> None:
        """Fetch and cache JWKS keys from Cognito, keyed by kid."""
        with urllib.request.urlopen(self.jwks_url) as response:
            jwks = json.loads(response.read())
        self._jwks = {key["kid"]: key for key in jwks["keys"]}

    def _get_public_key(self, kid: str) -> jwt.algorithms.RSAPublicKey:
        """Get the RSA public key for the given kid, refreshing JWKS if needed."""
        if kid not in self._jwks:
            self._fetch_jwks()
        jwk_data = self._jwks.get(kid)
        if not jwk_data:
            raise jwt.InvalidTokenError(f"Public key not found for kid: {kid}")
        return RSAAlgorithm.from_jwk(jwk_data)

    def verify_token(self, token: str) -> dict:
        """Verify a Cognito JWT and return decoded claims.

        Validates: signature (RS256), expiration, issuer, audience, token_use.
        """
        headers = jwt.get_unverified_header(token)
        kid = headers.get("kid")
        if not kid:
            raise jwt.InvalidTokenError("Token header missing kid")

        public_key = self._get_public_key(kid)

        return jwt.decode(
            token,
            key=public_key,
            algorithms=["RS256"],
            issuer=self.issuer,
            audience=self.app_client_id,
            options={"require": ["exp", "iss", "aud", "token_use"]},
        )
