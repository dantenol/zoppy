function generatePassword() {
  let randomPassword = document.getElementById("password");
  const length = 6;
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let random = "";
  for (let i = 0, n = charset.length; i < length; ++i) {
    random += charset.charAt(Math.floor(Math.random() * n));
  }
  randomPassword.value = random;
}
