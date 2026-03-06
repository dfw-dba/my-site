from pydantic import BaseModel


class UploadUrlRequest(BaseModel):
    """Schema for requesting a presigned upload URL."""

    filename: str
    content_type: str


class UploadUrlResponse(BaseModel):
    """Schema for the presigned upload URL response."""

    upload_url: str
    s3_key: str


class MediaRegister(BaseModel):
    """Schema for registering an uploaded media file."""

    s3_key: str
    filename: str
    content_type: str
    size_bytes: int | None = None
    width: int | None = None
    height: int | None = None
    caption: str | None = None
    album_id: int | None = None
    sort_order: int = 0


class AlbumCreate(BaseModel):
    """Schema for creating/updating an album via admin API."""

    slug: str
    title: str
    description: str | None = None
    category: str  # family, vacation, professional, showcase
    cover_image_id: int | None = None
    sort_order: int = 0
