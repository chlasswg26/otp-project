const registrationEmailTemplate = (code, expiry) => {
  return `
    <!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    /* Set the background color */
    body {
      background-color: #f1f1f1;
    }
    
    /* Set the style for the container */
    .container {
      background-color: #ffffff;
      border-radius: 10px;
      padding: 20px;
      margin: 0 auto;
      max-width: 600px;
      text-align: center;
    }
    
    /* Set the style for the heading */
    h1 {
      font-size: 30px;
      margin-top: 0;
      color: #333333;
    }
    
    /* Set the style for the verification code */
    .verification-code {
      font-size: 40px;
      color: #007bff;
      margin-top: 20px;
      margin-bottom: 40px;
    }
    
    /* Set the style for the paragraph */
    p {
      font-size: 18px;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>OTP Verification Code</h1>
    <p>Thank you for signing up for our service. To complete your verification, please enter the following verification code:</p>
    <div class="verification-code">${code}</div>
    <p>This code will expire in <b>${expiry}</b>. We appreciate your action and look forward to serving you!</p>
  </div>
</body>
</html>
  `;
}

module.exports = registrationEmailTemplate
