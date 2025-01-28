// server.js
app.use((req, res, next) => {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; font-src 'self' https://ka-f.fontawesome.com;"
    );
    next();
  });