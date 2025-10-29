import { useState } from "react";

export default function AvatarUpload({ userId }: { userId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // ✅ File type validation
    if (!["image/jpeg", "image/png"].includes(selected.type)) {
      setError("Only JPG or PNG images are allowed.");
      return;
    }

    // ✅ File size limit (2MB)
    if (selected.size > 2 * 1024 * 1024) {
      setError("Image too large (max 2MB).");
      return;
    }

    setError(null);
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("avatar", file);
    formData.append("userId", userId);

    try {
      const res = await fetch("/api/upload-avatar", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) alert("Avatar uploaded successfully!");
      else alert(data.error || "Upload failed.");
    } catch (err) {
      console.error(err);
      alert("Error uploading avatar.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 border p-4 rounded-lg bg-white shadow">
      {preview && (
        <img
          src={preview}
          alt="Preview"
          className="w-24 h-24 rounded-full object-cover border"
        />
      )}

      <input
        type="file"
        accept="image/png, image/jpeg"
        onChange={handleFileChange}
        className="border p-2 rounded-md w-full"
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
      >
        {uploading ? "Uploading..." : "Upload Avatar"}
      </button>
    </div>
  );
}
