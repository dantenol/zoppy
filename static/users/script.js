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

async function createUser() {
  const path = document.getElementById("url").value;
  const fullName = document.getElementById("name").value;
  const username = document.getElementById("user").value;
  const password = document.getElementById("password").value;

  try {
    const url = `https://${path}.zoppy.app/api/agents`;
    const options = {
      method: "post",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fullName, username, password }),
    };
    const res = await fetch(url, options);
    const data = await res.json();
    alert("Usuário criado!");
    console.log(data);
    return false;
  } catch (e) {
    alert("Algo deu errado!");
    console.log(e);
  }
}

window.onload = () => {
  function handleForm(event) {
    event.preventDefault();
  }
  const form = document.getElementById("myForm");
  form.addEventListener("submit", handleForm);
};
