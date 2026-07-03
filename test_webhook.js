const payload = {
  "lead_id": "TeSter-123-ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  "user_column_data": [
    {
      "column_name": "User Email",
      "string_value": "test@example.com",
      "column_id": "EMAIL"
    },
    {
      "column_name": "User Phone",
      "string_value": "+16505550123",
      "column_id": "PHONE_NUMBER"
    },
    {
      "column_name": "First Name",
      "string_value": "FirstName",
      "column_id": "FIRST_NAME"
    },
    {
      "column_name": "Last Name",
      "string_value": "LastName",
      "column_id": "LAST_NAME"
    }
  ],
  "api_version": "1.0",
  "form_id": 2,
  "campaign_id": 23993279721,
  "google_key": "dholera_secret_key_2026",
  "is_test": true,
  "gcl_id": "TeSter-123-ABCDEFGHIJKLMNOPQRSTUVWXYZ"
};

fetch('https://api.dholeraplatform.com/api/leads/webhook/google-ads', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
})
.then(res => res.text().then(text => ({ status: res.status, text })))
.then(console.log)
.catch(console.error);
