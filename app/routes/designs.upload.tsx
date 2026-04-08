import { useState, useCallback } from "react";
import {
  Page,
  Layout,
  Card,
  Button,
  TextField,
  DropZone,
  Banner,
  BlockStack,
  InlineStack,
  Text,
  Thumbnail,
  Box,
} from "@shopify/polaris";
import type { MetaFunction, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useNavigate, useFetcher } from "@remix-run/react";
import { apiPost } from "~/lib/api";
import type { Design } from "~/lib/types";

export const meta: MetaFunction = () => {
  return [{ title: "StellarPOD - Upload Design" }];
};

const STORE_ID = "demo-store";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const name = formData.get("name") as string;
  const fileBase64 = formData.get("fileBase64") as string;
  const filename = formData.get("filename") as string;
  const mimetype = formData.get("mimetype") as string;

  if (!name || !fileBase64 || !filename || !mimetype) {
    return json(
      { error: "Missing required fields: name, file data" },
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
    return json({ error: result.error, design: null }, { status: result.status || 500 });
  }

  // Return the design data so we can show copyright hash before redirecting
  return json({ error: null, design: result.data });
}

export default function UploadDesign() {
  const navigate = useNavigate();
  const fetcher = useFetcher<typeof action>();
  const [designName, setDesignName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const isSubmitting = fetcher.state === "submitting";
  const actionData = fetcher.data;
  const error = actionData && "error" in actionData ? actionData.error : null;
  const uploadedDesign = actionData && "design" in actionData ? actionData.design : null;

  const handleDropZoneDrop = useCallback(
    (_dropFiles: File[], acceptedFiles: File[]) => {
      const accepted = acceptedFiles[0];
      if (accepted) {
        setFile(accepted);
        setPreviewUrl(URL.createObjectURL(accepted));
        if (!designName) {
          setDesignName(accepted.name.replace(/\.[^/.]+$/, ""));
        }
      }
    },
    [designName],
  );

  const handleSubmit = useCallback(async () => {
    if (!file || !designName.trim()) return;

    // Convert file to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(",")[1]; // Remove data:...;base64, prefix
      const formData = new FormData();
      formData.set("name", designName.trim());
      formData.set("fileBase64", base64);
      formData.set("filename", file.name);
      formData.set("mimetype", file.type || "image/png");

      fetcher.submit(formData, { method: "POST" });
    };
    reader.readAsDataURL(file);
  }, [file, designName, fetcher]);

  const fileUpload = !file && (
    <DropZone.FileUpload actionTitle="Upload design file" actionHint="or drop files to upload" />
  );

  const uploadedFile = file && (
    <InlineStack gap="400" blockAlign="center">
      {previewUrl && (
        <Thumbnail source={previewUrl} alt={designName || "Design preview"} size="large" />
      )}
      <BlockStack gap="100">
        <Text as="p" variant="bodyMd" fontWeight="bold">{file.name}</Text>
        <Text as="p" variant="bodySm" tone="subdued">
          {(file.size / 1024 / 1024).toFixed(2)} MB
        </Text>
      </BlockStack>
    </InlineStack>
  );

  return (
    <Page
      title="Upload Design"
      backAction={{ content: "Designs", onAction: () => navigate("/designs") }}
    >
      <BlockStack gap="500">
        {error && (
          <Banner title="Upload Error" tone="critical">
            <p>{error}</p>
          </Banner>
        )}

        {uploadedDesign && (
          <Banner title="Design Uploaded" tone="success">
            <BlockStack gap="200">
              <p>
                Your design "{uploadedDesign.name}" has been uploaded successfully.
                Copyright registration is in progress on the Stellar blockchain.
              </p>
              {uploadedDesign.fileSha256 && (
                <p>
                  <Text as="span" fontWeight="bold">File Hash (SHA-256): </Text>
                  <Text as="span" variant="bodySm">{uploadedDesign.fileSha256}</Text>
                </p>
              )}
              {uploadedDesign.copyrightTxHash && (
                <p>
                  <Text as="span" fontWeight="bold">Copyright TX: </Text>
                  <Text as="span" variant="bodySm">{uploadedDesign.copyrightTxHash}</Text>
                </p>
              )}
              <Button onClick={() => navigate("/designs")}>Back to Designs</Button>
            </BlockStack>
          </Banner>
        )}

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Design File</Text>
                <DropZone
                  accept="image/*"
                  type="image"
                  onDrop={handleDropZoneDrop}
                  allowMultiple={false}
                >
                  {uploadedFile}
                  {fileUpload}
                </DropZone>
              </BlockStack>
            </Card>

            <Box paddingBlockStart="400">
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">Design Details</Text>
                  <TextField
                    label="Design Name"
                    value={designName}
                    onChange={setDesignName}
                    autoComplete="off"
                    placeholder="Enter a name for your design"
                  />
                  <TextField
                    label="Description"
                    value={description}
                    onChange={setDescription}
                    autoComplete="off"
                    multiline={4}
                    placeholder="Describe your design (optional)"
                  />
                </BlockStack>
              </Card>
            </Box>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Mockup Preview</Text>
                {previewUrl ? (
                  <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                    <img
                      src={previewUrl}
                      alt="Design preview"
                      style={{ width: "100%", height: "auto", borderRadius: "8px" }}
                    />
                  </Box>
                ) : (
                  <Box padding="800" background="bg-surface-secondary" borderRadius="200">
                    <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                      Upload a design to see mockup preview
                    </Text>
                  </Box>
                )}
                <Text as="p" variant="bodySm" tone="subdued">
                  Auto-generated mockups will appear here after upload.
                </Text>
              </BlockStack>
            </Card>

            <Box paddingBlockStart="400">
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">Copyright Protection</Text>
                  <Text as="p" variant="bodySm">
                    Your design will be automatically registered on the Stellar blockchain
                    for copyright protection. A unique hash of your design file will be
                    stored as proof of ownership.
                  </Text>
                </BlockStack>
              </Card>
            </Box>
          </Layout.Section>
        </Layout>

        <InlineStack align="end" gap="200">
          <Button onClick={() => navigate("/designs")}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={!file || !designName.trim() || isSubmitting}
          >
            Upload Design
          </Button>
        </InlineStack>
      </BlockStack>
    </Page>
  );
}
