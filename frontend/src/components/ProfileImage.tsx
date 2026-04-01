interface ProfileImageProps {
  src?: string;
  alt?: string;
}

export default function ProfileImage({ src, alt = "Profile photo" }: ProfileImageProps) {
  return (
    <img
      src={src || "/images/profile-default.png"}
      alt={alt}
      className="h-56 w-36 rounded-2xl border-2 border-gray-200 dark:border-gray-700 object-cover"
    />
  );
}
