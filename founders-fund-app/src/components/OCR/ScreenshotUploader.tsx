'use client';

export default function ScreenshotUploader() {
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('Selected screenshot', file.name);
    }
  };

  return (
    <div className="panel">
      <input type="file" accept="image/*" onChange={handleFile} />
    </div>
  );
}
