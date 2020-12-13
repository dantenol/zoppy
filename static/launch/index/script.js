window.onload = async () => {
  if (!localStorage.access_token) {
    return (window.location.href = "./login");
  }
  let data;
  try {
    const req = await fetch(
      connector + "chats/launch/list?access_token=" + localStorage.access_token
    );
    data = await req.json();
    if (data.error) {
      throw data.error;
    }
  } catch (error) {
    console.log(error.statusCode);
    if (error.statusCode === 401) {
      alert("Você precisa logar novamente!");
      window.location.href = "./login";
    }
    throw "something went wrong";
  }
  console.log(data);
  const el = document.getElementById("launchOptions");
  window.launchs = data;
  window.selectedGroups = [];
  Object.keys(data).forEach((i) => {
    const launchData = data[i];
    const opt = document.createElement("option");
    opt.innerText = launchData.launchName;
    opt.value = launchData.launchId;
    el.appendChild(opt);
  });
};

function checkboxLisener(e) {
  const val = e.target.checked;
  document.getElementById("sendToAll").indeterminate = true;
  const idx = window.selectedGroups.findIndex((id) => id === e.target.value);
  console.log(idx);
  if (val) {
    if (idx === -1) {
      window.selectedGroups.push(e.target.value);
    }
  } else {
    if (idx >= 0) {
      window.selectedGroups.splice(idx, 1);
    }
  }
}

function setAllCheckboxListener() {
  const checkboxes = document.querySelectorAll(
    "#launches table input[type='checkbox']:not(#sendToAll)"
  );
  document.getElementById("sendToAll").addEventListener("change", (e) => {
    console.log(e);
    if (e.target.checked) {
      const all = window.allGroups.map((g) => g.id);
      window.selectedGroups = all;
      checkboxes.forEach((c) => {
        c.checked = true;
      });
    } else {
      window.selectedGroups = [];
      checkboxes.forEach((c) => {
        c.checked = false;
      });
    }
  });
  checkboxes.forEach((c) => {
    c.addEventListener("change", checkboxLisener);
  });
}

function participantsBar(nbr) {
  const e = `<div class="outter"><div class="inner" style="width: ${
    (nbr / 256) * 100
  }%"></div></div>`;

  return e;
}

async function loadLaunch() {
  const select = document.getElementById("launchOptions").value;
  window.selectedGroups = [];
  try {
    const res = await fetch(
      connector +
        "chats/launch/countAllGroupParticipants?name=" +
        select +
        "&access_token=" +
        localStorage.access_token
    );
    const data = await res.json();
    document.getElementById("selectLaunch").style.display = "none";
    const launches = document.getElementById("launches");
    const table = document.getElementById("launchesTable");
    launches.style.display = "flex";
    const gps = Object.keys(data).map((id) => {
      return {
        id,
        ...data[id],
      };
    });
    window.allGroups = gps;
    const orderedGroups = gps.sort((a, b) => {
      const nA = a.name.match(/\d+$/g)[0];
      const nB = b.name.match(/\d+$/g)[0];
      if (Number(nA) < Number(nB)) {
        return 1;
      } else {
        return -1;
      }
    });
    console.log(orderedGroups);
    orderedGroups.forEach((d) => {
      const e = `<tr>
      <td>${d.name}</td>
      <td><div class="participantData"><p>${d.participants}</p>
      ${participantsBar(d.participants)}</div>
      </td>
      <td><input type="checkbox" value="${d.id}" />
      </tr>`;
      table.innerHTML += e;
    });
    setAllCheckboxListener();
  } catch (error) {
    alert("Algo deu errado ao acessar o lançamento");
    console.log(error);
  }
}

async function createGroup() {
  const select = document.getElementById("launchOptions").value;
  const btn = document.querySelector("#newGroup");
  btn.classList.toggle("loading");
  const launchOptions = launchs[select];
  let groupNumber;
  const res = prompt(
    "Qual vai ser o número do grupo, seguindo o modelo " +
      launchOptions.newGroupName +
      "?\nO padrão seria " +
      (launchOptions.latestGroupNumber + 1) +
      "\nDigite 0 para usar o parão, digite um número novo para ser criado, ou 'cancelar' para cancelar a ceiação do novo grupo"
  );
  console.log(launchOptions, res);
  if (!res || Number.isNaN(res)) {
    btn.classList.toggle("loading");
    alert("Criação do grupo cancelada");
    return;
  } else if (Number(res) > 0) {
    groupNumber = Number(res);
  }

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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ groupNumber }),
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
  const msg = document.getElementById("messageToSend").value;
  const select = document.getElementById("launchOptions").value;
  if (!selectedGroups.length) {
    alert("Você tem que selecionar os grupos para envio!");
    btn.classList.toggle("loading");
    return;
  }
  const sure = confirm(
    "Tem certeza que quer enviar essa mensagem para todos os grupos selecionados?"
  );
  if (!sure) {
    btn.classList.toggle("loading");
    return;
  }
  if (!msg) {
    alert("Você deve digitar a mensagem antes!")
    btn.classList.toggle("loading");
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
      body: JSON.stringify({ msg: msg, groups: selectedGroups }),
    };
    const res = await fetch(url, options);
    const data = await res.json();
    alert("Mensagens enviadas com sucesso!");
    msg.value = "";
    console.log(data);
  } catch (e) {
    alert("Algo deu errado no envio das mensagens!");
    console.log(e);
  }
  btn.classList.toggle("loading");
}
