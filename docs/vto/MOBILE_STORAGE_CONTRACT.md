# Mobile VTO storage contract

`UploadedImageAsset` is the canonical mobile-to-worker reference:

```ts
{ bucket: 'vto_inputs' | 'garments_original' | 'garments_processed', objectKey: 'user-id/file.png', mimeType: 'image/png' }
```

`objectKey` is durable; signed URLs are generated only for display and must not be persisted or submitted to the GPU service. `CloudStorageService.uploadPrivateImage` throws `StorageUploadError` on configuration or upload failure and never falls back to a device URI. Existing `uploadImage` remains only for legacy display workflows and should be migrated record-by-record by adding `Garment.storage_asset` after an approved upload; existing URL fields remain readable.

The VTO API receives `{category, garment_id, person_input_storage_key, garment_input_storage_key, outfit_name?, idempotency_key}`. The current worker reads both inputs from `vto_inputs`; the app uploads the person image there and requires the garment to be explicitly staged there too. A future contract may add per-input bucket fields, but must change the API, schema, client, and worker together. A completed response may contain a short-lived `result_signed_url` for display only.
