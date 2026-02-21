"""SQLAlchemy table definitions for Alembic migrations ONLY.

These models exist so Alembic can generate migration scripts. All runtime
queries go through DatabaseAPI which calls PostgreSQL stored functions.
"""

from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """Base class for all ORM models."""

    pass


class ResumeSection(Base):
    __tablename__ = "resume_sections"
    __table_args__ = {"schema": "internal"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    entries: Mapped[list["ProfessionalEntry"]] = relationship(back_populates="section")


class ProfessionalEntry(Base):
    __tablename__ = "professional_entries"
    __table_args__ = {"schema": "internal"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    section_id: Mapped[int] = mapped_column(ForeignKey("internal.resume_sections.id"))
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    organization: Mapped[str | None] = mapped_column(String(300))
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    description: Mapped[str | None] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    section: Mapped["ResumeSection"] = relationship(back_populates="entries")


class BlogPost(Base):
    __tablename__ = "blog_posts"
    __table_args__ = {"schema": "internal"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    slug: Mapped[str] = mapped_column(String(500), unique=True, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[str | None] = mapped_column(Text)
    published: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class ShowcaseItem(Base):
    __tablename__ = "showcase_items"
    __table_args__ = {"schema": "internal"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    slug: Mapped[str] = mapped_column(String(500), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    url: Mapped[str | None] = mapped_column(String(1000))
    repo_url: Mapped[str | None] = mapped_column(String(1000))
    cover_image_key: Mapped[str | None] = mapped_column(String(500))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Album(Base):
    __tablename__ = "albums"
    __table_args__ = {"schema": "internal"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    slug: Mapped[str] = mapped_column(String(500), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    items: Mapped[list["MediaItem"]] = relationship(back_populates="album")


class MediaItem(Base):
    __tablename__ = "media_items"
    __table_args__ = {"schema": "internal"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    object_key: Mapped[str] = mapped_column(String(1000), unique=True, nullable=False)
    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    content_type: Mapped[str] = mapped_column(String(200), nullable=False)
    size_bytes: Mapped[int | None] = mapped_column(Integer)
    album_id: Mapped[int | None] = mapped_column(ForeignKey("internal.albums.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    album: Mapped["Album | None"] = relationship(back_populates="items")
