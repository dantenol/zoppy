async function login() {
  const username = document.getElementById("email").value;
  const password = document.getElementById("pwd").value;
  if (!username || !password) {
    return alert("Preencha email e senha");
  }
  try {
    const url = connector + "agents/login";
    const options = {
      method: "post",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    };
    const res = await fetch(url, options);
    const data = await res.json();
    console.log(data);
    if (data.id) {
      localStorage.setItem("access_token", data.id);
      location.href = "..";
    } else {
      alert("Email ou senha inválidos!");
      throw false;
    }
  } catch (e) {
    console.log(e);
  }
}
