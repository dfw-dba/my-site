"""SQLAlchemy table definitions for Alembic migrations ONLY.

These models exist so Alembic can generate migration scripts. All runtime
queries go through DatabaseAPI which calls PostgreSQL stored functions.
"""

from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, String, Text
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
