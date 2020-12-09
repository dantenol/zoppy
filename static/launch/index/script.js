window.onload = async () => {
  if (!localStorage.access_token) {
    return (window.location.href = "./login");
  }
  const req = await fetch(
    connector + "chats/launch/list?access_token=" + localStorage.access_token
  );
  const data = await req.json();
  console.log(data);
  const el = document.getElementById("launchOptions");
  window.launchs = data;
  data.forEach((l) => {
    const opt = document.createElement("option");
    opt.innerText = l.launchName;
    opt.value = l.launchId;
    el.appendChild(opt);
  });
};

function participantsBar(nbr) {
  const e = `<div class="outter"><div class="inner" style="width: ${
    nbr / 256
  }%"></div></div>`;

  return e;
}

async function loadLaunch() {
  const select = document.getElementById("launchOptions").value;
  console.log(select);
  try {
    const res = await fetch(
      connector +
        "chats/launch/countAllGroupParticipants?name=" +
        select +
        "&access_token=" +
        localStorage.access_token
    );
    const data = await res.json();
    console.log(data);
    document.getElementById("selectLaunch").style.display = "none";
    const launches = document.getElementById("launches");
    const table = document.getElementById("launchesTable");
    launches.style.display = "flex";
    Object.keys(data).forEach((d) => {
      const el = data[d];
      const e = `<tr>
      <td>${el.name}</td>
      <td><div class="participantData"><p>${el.participants}</p>
      ${participantsBar(el.participants)}</div>
      </td>
      </tr>`;
      table.innerHTML += e;
    });
  } catch (error) {
    alert("Algo deu errado ao acessar o lançamento");
    console.log(error);
  }
}

async function createGroup() {
  const select = document.getElementById("launchOptions").value;
  const btn = document.querySelector("#newGroup");
  btn.classList.toggle("loading");
  console.log(btn);
  let data;
  try {
    const res = await fetch(
      connector +
        "chats/launch/createGroup?name=" +
        select +
        "&access_token=" +
        localStorage.access_token,
      {
        method: "post",
      }
    );
    data = await res.json();
    console.log(data);
    alert("Grupo criado!");
    document.getElementById("launchesTable").innerHTML = "";
    loadLaunch();
  } catch (e) {
    alert("Algo deu errano na criação do grupo!");
    console.log(e);
  }
  btn.classList.toggle("loading");
}

async function bulkSend() {
  const btn = document.querySelector("#send button");
  btn.classList.toggle("loading");
  const sure = confirm(
    "Tem certeza que quer enviar essa mensagem para todos os grupos?"
  );
  const msg = document.getElementById("messageToSend").value;
  const select = document.getElementById("launchOptions").value;
  if (!sure) {
    return;
  }
  try {
    const url =
      connector +
      "chats/launch/sendBulkMsg?name=" +
      select +
      "&access_token=" +
      localStorage.access_token;
    const options = {
      method: "post",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ msg: msg }),
    };
    const res = await fetch(url, options);
    const data = await res.json();
    alert("Mensagens enviadas com sucesso!");
    console.log(data);
  } catch (e) {
    alert("Algo deu errado no envio das mensagens!");
    console.log(e);
  }
  btn.classList.toggle("loading");
}
