# Complete Express API Map

## Group: `/api/admin`

| Method | Endpoint | Middleware / Auth | Controller / Service | Description / Notes |
|---|---|---|---|---|

## Group: `/api/analytics`

| Method | Endpoint | Middleware / Auth | Controller / Service | Description / Notes |
|---|---|---|---|---|

## Group: `/api/auth`

| Method | Endpoint | Middleware / Auth | Controller / Service | Description / Notes |
|---|---|---|---|---|
| POST | /login | loginLimiter | authController.login | |
| POST | /refresh-token | None | authController.refreshToken | |
| POST | /logout | None | authController.logout | |
| GET | /sessions | authController.verifyToken | authController.getSessions | |
| GET | /me | authController.verifyToken | authController.getMe | |
| GET | /mfa/status | None | authController.getMfaStatus | |
| GET | /mfa/provisioning-uri | authController.verifyToken | authController.getMfaProvisioningUri | |

## Group: `/api/bi`

| Method | Endpoint | Middleware / Auth | Controller / Service | Description / Notes |
|---|---|---|---|---|

## Group: `/api/clearance`

| Method | Endpoint | Middleware / Auth | Controller / Service | Description / Notes |
|---|---|---|---|---|

## Group: `/api/content`

| Method | Endpoint | Middleware / Auth | Controller / Service | Description / Notes |
|---|---|---|---|---|

## Group: `/api/generalsettings`

| Method | Endpoint | Middleware / Auth | Controller / Service | Description / Notes |
|---|---|---|---|---|

## Group: `/api/import`

| Method | Endpoint | Middleware / Auth | Controller / Service | Description / Notes |
|---|---|---|---|---|

## Group: `/api/intelligence`

| Method | Endpoint | Middleware / Auth | Controller / Service | Description / Notes |
|---|---|---|---|---|

## Group: `/api/leads`

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

## Group: `/api/payment`

| Method | Endpoint | Middleware / Auth | Controller / Service | Description / Notes |
|---|---|---|---|---|

## Group: `/api/pdf`

| Method | Endpoint | Middleware / Auth | Controller / Service | Description / Notes |
|---|---|---|---|---|

## Group: `/api/preferences`

| Method | Endpoint | Middleware / Auth | Controller / Service | Description / Notes |
|---|---|---|---|---|

## Group: `/api/settings`

| Method | Endpoint | Middleware / Auth | Controller / Service | Description / Notes |
|---|---|---|---|---|

## Group: `/api/tblmng`

| Method | Endpoint | Middleware / Auth | Controller / Service | Description / Notes |
|---|---|---|---|---|

## Group: `/api/updates`

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

## Group: `/api/user`

| Method | Endpoint | Middleware / Auth | Controller / Service | Description / Notes |
|---|---|---|---|---|

## Group: `/api/userAuth`

| Method | Endpoint | Middleware / Auth | Controller / Service | Description / Notes |
|---|---|---|---|---|
| POST | /signup | signupLimiter, requestBody(signupSchema) | controller.signup | |
| POST | /login | loginLimiter, requestBody(loginSchema) | controller.login | |
| POST | /forgot-password | resetLimiter, requestBody(forgotPasswordSchema) | controller.requestPasswordReset | |
| POST | /reset-password | resetLimiter, requestBody(resetPasswordSchema) | controller.resetPassword | |
| GET | /me | controller.requireUser | controller.me | |
| DELETE | /delete-account | controller.requireUser | controller.deleteAccount | |

## Group: `/api/whatsapp`

| Method | Endpoint | Middleware / Auth | Controller / Service | Description / Notes |
|---|---|---|---|---|

