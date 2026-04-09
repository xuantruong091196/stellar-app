import { useState, useCallback, useRef } from "react";
import type { MetaFunction, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useFetcher, Link } from "@remix-run/react";
import { apiPost } from "~/lib/api";
import type { Design } from "~/lib/types";
import { PageHeader } from "~/components/ui/PageHeader";
import { Button, LinkButton } from "~/components/ui/Button";

export const meta: MetaFunction = () => [
  { title: "StellarPOD — Upload Design" },
];

const STORE_ID = "demo-store";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const name = formData.get("name") as string;
  const fileBase64 = formData.get("fileBase64") as string;
  const filename = formData.get("filename") as string;
  const mimetype = formData.get("mimetype") as string;

  if (!name || !fileBase64 || !filename || !mimetype) {
    return json(
      { error: "Missing required fields: name, file data", design: null },
      { status: 400 },
    );
  }

  const result = await apiPost<Design>(`/designs/${STORE_ID}`, {
    name,
    fileBase64,
    filename,
    mimetype,
  });

  if (result.error) {
    return json(
      { error: result.error, design: null },
      { status: result.status || 500 },
    );
  }

  return json({ error: null, design: result.data });
}

export default function UploadDesign() {
  const fetcher = useFetcher<typeof action>();
  const inputRef = useRef<HTMLInputElement>(null);
  const [designName, setDesignName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const isSubmitting = fetcher.state === "submitting";
  const error = fetcher.data && "error" in fetcher.data ? fetcher.data.error : null;
  const uploadedDesign =
    fetcher.data && "design" in fetcher.data ? fetcher.data.design : null;

  const acceptFile = useCallback(
    (f: File) => {
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
      if (!designName) setDesignName(f.name.replace(/\.[^/.]+$/, ""));
    },
    [designName],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const f = e.dataTransfer.files?.[0];
      if (f) acceptFile(f);
    },
    [acceptFile],
  );

  const handleSubmit = useCallback(() => {
    if (!file || !designName.trim()) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(",")[1];
      const formData = new FormData();
      formData.set("name", designName.trim());
      formData.set("fileBase64", base64);
      formData.set("filename", file.name);
      formData.set("mimetype", file.type || "image/png");
      fetcher.submit(formData, { method: "POST" });
    };
    reader.readAsDataURL(file);
  }, [file, designName, fetcher]);

  return (
    <>
      <div className="flex items-center gap-3 text-sm">
        <Link
          to="/designs"
          className="text-on-surface-variant hover:text-primary flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Designs
        </Link>
        <span className="text-on-surface-variant/40">/</span>
        <span className="text-on-surface-variant">Upload</span>
      </div>

      <PageHeader
        title="Upload Design"
        subtitle="Register your design on the Stellar blockchain"
      />

      {error && (
        <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-6 py-4 rounded-2xl">
          <p className="text-sm font-bold">Upload Error</p>
          <p className="text-xs opacity-80">{error}</p>
        </div>
      )}

      {uploadedDesign && (
        <div className="bg-green-400/10 border border-green-400/20 text-green-200 px-6 py-5 rounded-2xl space-y-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined">check_circle</span>
            <p className="font-bold">Design uploaded successfully</p>
          </div>
          <p className="text-sm opacity-90">
            &ldquo;{uploadedDesign.name}&rdquo; is registering on Stellar.
          </p>
          {uploadedDesign.fileSha256 && (
            <p className="text-xs font-mono opacity-80">
              SHA-256: {uploadedDesign.fileSha256}
            </p>
          )}
          {uploadedDesign.copyrightTxHash && (
            <p className="text-xs font-mono opacity-80">
              TX: {uploadedDesign.copyrightTxHash}
            </p>
          )}
          <LinkButton to="/designs" variant="secondary" className="!mt-2">
            Back to Designs
          </LinkButton>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* DropZone */}
          <section className="bg-surface-container-low rounded-2xl p-8 space-y-4">
            <h2 className="text-xl font-bold font-headline">Design File</h2>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`relative w-full h-64 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-outline-variant/30 hover:border-primary/50 hover:bg-surface-container/50"
              } flex flex-col items-center justify-center gap-3`}
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) acceptFile(f);
                }}
              />
              {file ? (
                <div className="flex items-center gap-4">
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt={file.name}
                      className="w-24 h-24 rounded-xl object-contain bg-surface-container-highest p-2"
                    />
                  )}
                  <div className="text-left">
                    <p className="font-bold">{file.name}</p>
                    <p className="text-sm text-on-surface-variant font-mono">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setPreviewUrl(null);
                      }}
                      className="text-xs text-red-400 hover:underline mt-1"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="material-symbols-outlined text-5xl text-on-surface-variant/40">
                    cloud_upload
                  </span>
                  <p className="font-bold">Drop your design here</p>
                  <p className="text-sm text-on-surface-variant">
                    or click to browse (PNG, JPG, SVG)
                  </p>
                </>
              )}
            </div>
          </section>

          {/* Details */}
          <section className="bg-surface-container-low rounded-2xl p-8 space-y-6">
            <h2 className="text-xl font-bold font-headline">Design Details</h2>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                Design Name
              </label>
              <input
                type="text"
                value={designName}
                onChange={(e) => setDesignName(e.target.value)}
                className="ghost-input font-headline text-lg"
                placeholder="Enter a name for your design"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full bg-surface-container text-on-surface rounded-xl px-4 py-3 border-0 focus:ring-2 focus:ring-primary resize-none"
                placeholder="Describe your design (optional)"
              />
            </div>
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-8">
          <section className="bg-surface-container-low rounded-2xl p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-4">
              Preview
            </h3>
            {previewUrl ? (
              <div className="rounded-2xl overflow-hidden bg-surface-container-highest p-4">
                <img
                  src={previewUrl}
                  alt="Design preview"
                  className="w-full h-auto"
                />
              </div>
            ) : (
              <div className="rounded-2xl bg-surface-container-highest p-8 flex items-center justify-center h-48">
                <p className="text-xs text-on-surface-variant text-center">
                  Upload a design to see a preview
                </p>
              </div>
            )}
          </section>

          <section className="stellar-gradient rounded-2xl p-6 text-white">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined">verified</span>
              <h3 className="font-bold font-headline">Copyright Protection</h3>
            </div>
            <p className="text-sm text-white/80">
              Your design will be automatically registered on the Stellar
              blockchain. A SHA-256 hash will be stored as immutable proof of
              ownership.
            </p>
          </section>
        </div>
      </div>

      <div className="flex items-center gap-3 justify-end">
        <LinkButton to="/designs" variant="secondary">
          Cancel
        </LinkButton>
        <Button
          onClick={handleSubmit}
          disabled={!file || !designName.trim() || isSubmitting}
          icon="upload"
        >
          {isSubmitting ? "Uploading..." : "Upload Design"}
        </Button>
      </div>
    </>
  );
}
