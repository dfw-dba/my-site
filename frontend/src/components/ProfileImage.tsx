import ProfilePlaceholder from "./ProfilePlaceholder";

interface ProfileImageProps {
  src?: string;
  alt?: string;
}

export default function ProfileImage({ src, alt = "Profile photo" }: ProfileImageProps) {
  if (!src) {
    return <ProfilePlaceholder />;
  }

  return (
    <img
      src={src}
      alt={alt}
      className="h-36 w-36 rounded-full border-2 border-gray-200 dark:border-gray-700 object-cover"
    />
  );
}
