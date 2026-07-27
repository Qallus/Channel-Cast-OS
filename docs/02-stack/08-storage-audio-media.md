# Storage, Audio, and Media

## Storage Buckets

Suggested buckets:

- audio-assets
- audio-drafts
- effects-library
- listing-images
- location-images
- device-install-photos
- partner-deliverables
- reports

## Audio Asset Workflow

1. User uploads or records audio.
2. File is stored as draft.
3. Metadata is saved to `audio_assets`.
4. Optional processing creates waveform, normalized preview, and duration.
5. User submits for approval.
6. Admin/partner approves or rejects with notes.
7. Approved file becomes available for campaigns.
8. Device schedules reference approved audio URLs only.

## File Metadata

- Original filename
- MIME type
- File size
- Duration
- Bitrate/sample rate if available
- Transcript
- Uploaded by
- Organization owner
- Approval status
- Usage count

## Rules

- Never deploy unapproved ad spots.
- Keep raw original and processed copy if possible.
- Use signed URLs for protected audio.
- Public audio previews should be intentional, not default.
- Store partner deliverables under assigned request/project records.
