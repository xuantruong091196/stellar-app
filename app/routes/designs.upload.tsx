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
import type { MetaFunction } from "@remix-run/node";
import { useNavigate } from "@remix-run/react";

export const meta: MetaFunction = () => {
  return [{ title: "StellarPOD - Upload Design" }];
};

export default function UploadDesign() {
  const navigate = useNavigate();
  const [designName, setDesignName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
    [designName]
  );

  const handleSubmit = useCallback(async () => {
    if (!file) {
      setError("Please select a design file to upload.");
      return;
    }
    if (!designName.trim()) {
      setError("Please enter a design name.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // TODO: Upload file to stellarpod-api
      // const formData = new FormData();
      // formData.append("file", file);
      // formData.append("name", designName);
      // formData.append("description", description);
      // const response = await fetch(`${API_URL}/api/v1/designs`, {
      //   method: "POST",
      //   body: formData,
      // });

      // Simulate upload delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setSuccess(true);
    } catch {
      setError("Failed to upload design. Please try again.");
    } finally {
      setUploading(false);
    }
  }, [file, designName, description]);

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
          <Banner title="Upload Error" tone="critical" onDismiss={() => setError(null)}>
            <p>{error}</p>
          </Banner>
        )}

        {success && (
          <Banner title="Design Uploaded" tone="success" onDismiss={() => setSuccess(false)}>
            <p>
              Your design has been uploaded successfully. Copyright registration is in progress
              on the Stellar blockchain.
            </p>
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
            loading={uploading}
            disabled={!file || !designName.trim()}
          >
            Upload Design
          </Button>
        </InlineStack>
      </BlockStack>
    </Page>
  );
}
