# Express API Map (V6)

This document outlines the API flows for the Dholera-backend, distinguishing all 22 mounted route aliases and their respective controller files.

## Mounted Route: `/api/leads`
*Controller Module: `leads.js`*

| Method | Endpoint | Middleware / Auth | Controller / Service | Description / Notes |
|---|---|---|---|---|
| GET | / | verifyToken | leadsController.getLeads | |
| GET | /check-visitor/:fingerprint | None | leadsController.checkVisitor | |
| POST | /onboard | onboardRateLimiter, requestBody(onboardLeadSchema) | leadsController.onboardLead | |
| POST | /verify-otp | otpLimiter, requestBody(verifyOtpSchema) | leadsController.verifyOtp | |
| POST | /save-direct | requestBody(onboardLeadSchema) | leadsController.saveDirect | |
| POST | /track-returning | requestBody(trackReturningSchema) | leadsController.trackReturning | |
| GET | /verify-token | None | leadsController.verifyLeadToken | |
| PATCH | /profile | requestBody(updateProfileSchema) | leadsController.updateProfile | |
| GET | /export | verifyToken | leadsController.exportLeads | |
| POST | / | formLimiter, requestBody(createLeadSchema) | leadsController.createLead | |
| PUT | /:id/status | verifyToken | leadsController.updateStatus | |
| PUT | /:id/notes | verifyToken | leadsController.updateNotes | |
| GET | /:id/whatsapp-url | verifyToken | leadsController.getWhatsappUrl | |
| POST | /:id/whatsapp-log | verifyToken | leadsController.logWhatsapp | |
| POST | /import | verifyToken, memoryUpload.single('file') | leadsController.importLeads | |
| PUT | /:id/read | verifyToken | leadsController.markRead | |
| GET | /system/backup | verifyToken | leadsController.systemBackup | |
| POST | /system/restore | verifyToken, memoryUpload.single('file') | leadsController.systemRestore | |
| POST | /webhook/google-ads | None | leadsController.googleAdsWebhook | |
| DELETE | /:id | verifyToken | leadsController.deleteLead | |

## Mounted Route: `/api/updates`
*Controller Module: `updates.js`*

| Method | Endpoint | Middleware / Auth | Controller / Service | Description / Notes |
|---|---|---|---|---|
| POST | /recover-post | verifyToken | updatesController.recoverPost | |
| GET | /migrate-db-now | verifyToken | updatesController.migrateDbNow | |
| GET | /fix-live | verifyToken | updatesController.fixLiveServer | |
| GET | / | None | updatesController.getUpdates | |
| GET | /admin/all | verifyToken | updatesController.getUpdates | |
| GET | /:id | None | updatesController.getUpdateById | |
| POST | / | verifyToken, adminMutationLimiter, upload.single('image') | updatesController.createUpdate | |
| PUT | /:id | verifyToken, adminMutationLimiter, upload.single('image') | updatesController.updateUpdate | |
| DELETE | /:id | verifyToken, adminMutationLimiter | updatesController.deleteUpdate | |
| POST | /seed/discover-dholera | verifyToken, adminMutationLimiter | updatesController.seedDiscoverDholera | |

## Mounted Route: `/api/content/updates`
*Alias of: `updates.js`*

| Method | Endpoint | Middleware / Auth | Controller / Service | Description / Notes |
|---|---|---|---|---|
| POST | /recover-post | verifyToken | updatesController.recoverPost | |
| GET | /migrate-db-now | verifyToken | updatesController.migrateDbNow | |
| GET | /fix-live | verifyToken | updatesController.fixLiveServer | |
| GET | / | None | updatesController.getUpdates | |
| GET | /admin/all | verifyToken | updatesController.getUpdates | |
| GET | /:id | None | updatesController.getUpdateById | |
| POST | / | verifyToken, adminMutationLimiter, upload.single('image') | updatesController.createUpdate | |
| PUT | /:id | verifyToken, adminMutationLimiter, upload.single('image') | updatesController.updateUpdate | |
| DELETE | /:id | verifyToken, adminMutationLimiter | updatesController.deleteUpdate | |
| POST | /seed/discover-dholera | verifyToken, adminMutationLimiter | updatesController.seedDiscoverDholera | |

## Mounted Route: `/api/analytics`
*Controller Module: `analytics.js`*

| Method | Endpoint | Middleware / Auth | Controller / Service | Description / Notes |
|---|---|---|---|---|

## Mounted Route: `/api/auth`
*Controller Module: `auth.js`*

| Method | Endpoint | Middleware / Auth | Controller / Service | Description / Notes |
|---|---|---|---|---|
| POST | /login | loginLimiter | authController.login | |
| POST | /refresh-token | None | authController.refreshToken | |
| POST | /logout | None | authController.logout | |
| GET | /sessions | authController.verifyToken | authController.getSessions | |
| GET | /me | authController.verifyToken | authController.getMe | |
| GET | /mfa/status | None | authController.getMfaStatus | |
| GET | /mfa/provisioning-uri | authController.verifyToken | authController.getMfaProvisioningUri | |

## Mounted Route: `/api/user-auth`
*Controller Module: `userAuth.js`*

| Method | Endpoint | Middleware / Auth | Controller / Service | Description / Notes |
|---|---|---|---|---|
| POST | /signup | signupLimiter, requestBody(signupSchema) | controller.signup | |
| POST | /login | loginLimiter, requestBody(loginSchema) | controller.login | |
| POST | /forgot-password | resetLimiter, requestBody(forgotPasswordSchema) | controller.requestPasswordReset | |
| POST | /reset-password | resetLimiter, requestBody(resetPasswordSchema) | controller.resetPassword | |
| GET | /me | controller.requireUser | controller.me | |
| DELETE | /delete-account | controller.requireUser | controller.deleteAccount | |

## Mounted Route: `/api/pdf`
*Controller Module: `pdf.js`*

| Method | Endpoint | Middleware / Auth | Controller / Service | Description / Notes |
|---|---|---|---|---|

## Mounted Route: `/api/payment`
*Controller Module: `payment.js`*

| Method | Endpoint | Middleware / Auth | Controller / Service | Description / Notes |
|---|---|---|---|---|

## Mounted Route: `/api/bi`
*Controller Module: `bi.js`*

| Method | Endpoint | Middleware / Auth | Controller / Service | Description / Notes |
|---|---|---|---|---|

## Mounted Route: `/api/whatsapp`
*Controller Module: `whatsapp.js`*

| Method | Endpoint | Middleware / Auth | Controller / Service | Description / Notes |
|---|---|---|---|---|

## Mounted Route: `/api/settings`
*Controller Module: `settings.js`*

| Method | Endpoint | Middleware / Auth | Controller / Service | Description / Notes |
|---|---|---|---|---|

## Mounted Route: `/api/clearance`
*Controller Module: `clearance.js`*

| Method | Endpoint | Middleware / Auth | Controller / Service | Description / Notes |
|---|---|---|---|---|

## Mounted Route: `/api/admin`
*Controller Module: `admin.js`*

| Method | Endpoint | Middleware / Auth | Controller / Service | Description / Notes |
|---|---|---|---|---|

## Mounted Route: `/api/preferences`
*Controller Module: `preferences.js`*

| Method | Endpoint | Middleware / Auth | Controller / Service | Description / Notes |
|---|---|---|---|---|

## Mounted Route: `/api/content`
*Controller Module: `content.js`*

| Method | Endpoint | Middleware / Auth | Controller / Service | Description / Notes |
|---|---|---|---|---|

## Mounted Route: `/api/intelligence`
*Controller Module: `intelligence.js`*

| Method | Endpoint | Middleware / Auth | Controller / Service | Description / Notes |
|---|---|---|---|---|

## Mounted Route: `/api/tblmng`
*Controller Module: `tblmng.js`*

| Method | Endpoint | Middleware / Auth | Controller / Service | Description / Notes |
|---|---|---|---|---|

## Mounted Route: `/api/user`
*Controller Module: `user.js`*

| Method | Endpoint | Middleware / Auth | Controller / Service | Description / Notes |
|---|---|---|---|---|

## Mounted Route: `/api/generalsetting`
*Controller Module: `generalsettings.js`*

| Method | Endpoint | Middleware / Auth | Controller / Service | Description / Notes |
|---|---|---|---|---|

## Mounted Route: `/api/invoicesetting`
*Alias of: `generalsettings.js`*

| Method | Endpoint | Middleware / Auth | Controller / Service | Description / Notes |
|---|---|---|---|---|

## Mounted Route: `/api/defaultentrysetting`
*Alias of: `generalsettings.js`*

| Method | Endpoint | Middleware / Auth | Controller / Service | Description / Notes |
|---|---|---|---|---|

## Mounted Route: `/api/import`
*Controller Module: `import.js`*

| Method | Endpoint | Middleware / Auth | Controller / Service | Description / Notes |
|---|---|---|---|---|

