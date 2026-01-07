// index.js - LAGUNA ROLEPLAY ULTRA COMPLETO V2
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const fs = require("fs");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const PREFIX = "!";
const DATA = {
  rg: "./data/rgs.json",
  cnh: "./data/cnh.json",
  econ: "./data/economia.json",
  antecedentes: "./data/antecedentes.json",
  mandados: "./data/mandados.json"
};

const LOGS = {
  rg: "logs-rg",
  policial: "logs-policial",
  judiciario: "logs-judiciario",
  economia: "logs-economia"
};

const CARGOS_CPF_COMPLETO = [
  "Fundador","Administrador","Gerente de Comunidade","Monitor",
  "Polícia Civil","Polícia Militar","Polícia Federal","PRF","Polícia do Exército"
];

// ---------- FUNÇÕES UTILITÁRIAS ----------
function gerarNumero19() { return Array.from({length:19},()=>Math.floor(Math.random()*10)).join(""); }
function gerarCPF() { return gerarNumero19().replace(/^(\d{1})(\d{3})(\d{3})(\d{3})(\d{3})(\d{3})$/, "$1.$2.$3.$4.$5.$6"); }
function mascararCPF(cpf) { const p=cpf.split("."); return `${p[0]}.***.***.***.***.***.${p[5]}`; }
function carregarJSON(file) { if(!fs.existsSync(file)) fs.writeFileSync(file,"{}"); try{ return JSON.parse(fs.readFileSync(file)); } catch{return {}; } }
function salvarJSON(file,data){ fs.writeFileSync(file,JSON.stringify(data,null,2)); }
function calcularIdade(data){ const [d,m,a]=data.split("/").map(Number); const hoje=new Date(); let idade=hoje.getFullYear()-a; if(hoje.getMonth()+1 < m || (hoje.getMonth()+1===m && hoje.getDate()<d)) idade--; return idade; }
function formatDate(ts){ const d=new Date(ts); return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`; }
function logEmbed(guild,tipo,autor,alvo,acao,cor="#2ecc71"){ const canal=guild.channels.cache.find(c=>c.name===LOGS[tipo]); if(!canal) return; const embed=new EmbedBuilder().setTitle(`📌 LOG - ${tipo.toUpperCase()}`).setColor(cor).addFields({name:"👤 Autor",value:autor.tag,inline:true},{name:"👥 Alvo",value:alvo?alvo.tag:"Nenhum",inline:true},{name:"📝 Ação",value:acao}).setTimestamp(); canal.send({embeds:[embed]}); }

// ---------- EVENTO MESSAGE ----------
client.on("messageCreate",async message=>{
  if(message.author.bot || !message.content.startsWith(PREFIX)) return;
  const args=message.content.slice(PREFIX.length).trim().split(";");
  const cmd=args.shift().toLowerCase();

  const rgs=carregarJSON(DATA.rg);
  const cnhs=carregarJSON(DATA.cnh);
  const econ=carregarJSON(DATA.econ);
  const antecedentes=carregarJSON(DATA.antecedentes);
  const mandados=carregarJSON(DATA.mandados);

  // ---------- RG ----------
  if(cmd==="setrg"){
    if(rgs[message.author.id]) return message.reply("❌ Você já possui RG registrado.");
    if(args.length<4) return message.reply("❌ Use: `!setrg Nome;Estado Civil;DD/MM/AAAA;Gênero`");
    const [nome,estado,nascimento,genero]=args;
    const idade=calcularIdade(nascimento);
    if(idade<0 || idade>120) return message.reply("❌ Data de nascimento inválida.");
    const rg={nome,rg:gerarNumero19(),estado,nascimento,idade,cpf:gerarCPF(),genero,status:"Válido",validade:Date.now()+31536000000};
    rgs[message.author.id]=rg; salvarJSON(DATA.rg,rgs);
    logEmbed(message.guild,"rg",message.author,message.author,"RG criado");
    message.reply("✅ RG criado com sucesso!");
  }

  if(cmd==="rg"){
    const rg=rgs[message.author.id]; if(!rg) return message.reply("❌ Você não possui RG.");
    const podeVerCPF=message.member.roles.cache.some(r=>CARGOS_CPF_COMPLETO.includes(r.name)) || message.author.id===message.author.id;
    const cpfExibido=podeVerCPF ? rg.cpf : mascararCPF(rg.cpf);
    const embed=new EmbedBuilder().setTitle("🪪 Carteira de Identidade").setColor("#2ecc71").setDescription("━━━━━━━━━━━━━━━━━━━━").addFields(
      {name:"👤 Nome Completo",value:rg.nome},
      {name:"🆔 RG",value:rg.rg},
      {name:"💍 Estado Civil",value:rg.estado},
      {name:"🎂 Idade",value:`${rg.idade}`},
      {name:"📄 CPF",value:cpfExibido},
      {name:"⚧ Gênero",value:rg.genero},
      {name:"✅ Status",value:rg.status},
      {name:"📅 Validade",value:formatDate(rg.validade)}
    ).setFooter({text:"Documento RP válido"}).setTimestamp();
    message.reply({embeds:[embed]});
  }

  if(cmd==="consultar"){
    const user=message.mentions.users.first(); if(!user) return message.reply("❌ Mencione o usuário.");
    const rg=rgs[user.id]; if(!rg) return message.reply("❌ Usuário não possui RG.");
    const podeVerCPF=message.member.roles.cache.some(r=>CARGOS_CPF_COMPLETO.includes(r.name));
    const cpfExibido=podeVerCPF ? rg.cpf : mascararCPF(rg.cpf);
    const embed=new EmbedBuilder().setTitle("🪪 Carteira de Identidade").setColor("#3498db").setDescription("━━━━━━━━━━━━━━━━━━━━").addFields(
      {name:"👤 Nome Completo",value:rg.nome},
      {name:"🆔 RG",value:rg.rg},
      {name:"💍 Estado Civil",value:rg.estado},
      {name:"🎂 Idade",value:`${rg.idade}`},
      {name:"📄 CPF",value:cpfExibido},
      {name:"⚧ Gênero",value:rg.genero},
      {name:"✅ Status",value:rg.status},
      {name:"📅 Validade",value:formatDate(rg.validade)}
    ).setFooter({text:"Documento RP válido"}).setTimestamp();
    message.reply({embeds:[embed]});
    logEmbed(message.guild,"policial",message.author,user,"Consultou RG");
  }

  if(cmd==="rgeditar"){
    const cargos=["Fundador","Gerente de Comunidade","Monitor","Administrador"];
    if(!message.member.roles.cache.some(r=>cargos.includes(r.name))) return message.reply("❌ Sem permissão.");
    const user=message.mentions.users.first(); if(!user) return message.reply("❌ Mencione o usuário.");
    if(!rgs[user.id]) return message.reply("❌ Usuário sem RG.");
    const novoNome=args.join(";"); rgs[user.id].nome=novoNome; salvarJSON(DATA.rg,rgs);
    logEmbed(message.guild,"rg",message.author,user,`Nome alterado para ${novoNome}`);
    message.reply("✅ Nome do RG atualizado!");
  }

  if(cmd==="rgdeletar"){
    const cargos=["Fundador","Gerente de Comunidade","Monitor","Administrador"];
    if(!message.member.roles.cache.some(r=>cargos.includes(r.name))) return message.reply("❌ Sem permissão.");
    const user=message.mentions.users.first(); if(!user) return message.reply("❌ Mencione o usuário.");
    if(!rgs[user.id]) return message.reply("❌ Usuário sem RG.");
    delete rgs[user.id]; salvarJSON(DATA.rg,rgs);
    logEmbed(message.guild,"rg",message.author,user,"RG deletado","#e74c3c");
    message.reply("🗑️ RG deletado com sucesso!");
  }

  // ---------- ECONOMIA ----------
  if(cmd==="saldo"){
    const userId=message.author.id; if(!econ[userId]) econ[userId]={dinheiro:0}; 
    message.reply(`💰 Seu saldo: $${econ[userId].dinheiro}`);
  }

  if(cmd==="pagar"){
    const target=message.mentions.users.first(); if(!target) return message.reply("❌ Mencione alguém.");
    const valor=parseInt(args[0]); if(isNaN(valor) || valor<=0) return message.reply("❌ Valor inválido.");
    if(!econ[message.author.id]) econ[message.author.id]={dinheiro:0};
    if(econ[message.author.id].dinheiro<valor) return message.reply("❌ Saldo insuficiente.");
    if(!econ[target.id]) econ[target.id]={dinheiro:0};
    econ[message.author.id].dinheiro-=valor; econ[target.id].dinheiro+=valor;
    salvarJSON(DATA.econ,econ);
    message.reply(`✅ Transferido $${valor} para ${target.tag}`);
    logEmbed(message.guild,"economia",message.author,target,`Pagou $${valor}`);
  }

  // ---------- CNH ----------
  if(cmd==="cassarcnh"){
    const user=message.mentions.users.first(); if(!user) return message.reply("❌ Mencione o usuário.");
    cnhs[user.id]={status:"Cassada",motivo:args.join(";")||"Não informado"};
    salvarJSON(DATA.cnh,cnhs);
    message.reply(`🚫 CNH de ${user.tag} cassada!`);
    logEmbed(message.guild,"policial",message.author,user,`CNH cassada`);
  }

  if(cmd==="liberarcnh"){
    const user=message.mentions.users.first(); if(!user) return message.reply("❌ Mencione o usuário.");
    cnhs[user.id]={status:"Liberada"};
    salvarJSON(DATA.cnh,cnhs);
    message.reply(`✅ CNH de ${user.tag} liberada!`);
    logEmbed(message.guild,"policial",message.author,user,`CNH liberada`);
  }

  // ---------- MANDADOS ----------
  if(cmd==="mandado"){
    const user=message.mentions.users.first(); if(!user) return message.reply("❌ Mencione o usuário.");
    mandados[user.id]={motivo:args.join(";")||"Não informado",data:Date.now()};
    salvarJSON(DATA.mandados,mandados);
    message.reply(`⚖️ Mandado criado para ${user.tag}`);
    logEmbed(message.guild,"judiciario",message.author,user,`Mandado criado`);
  }

  // ---------- ANTECEDENTES ----------
  if(cmd==="addantecedente"){
    const user=message.mentions.users.first(); if(!user) return message.reply("❌ Mencione o usuário.");
    if(!antecedentes[user.id]) antecedentes[user.id]=[];
    antecedentes[user.id].push(args.join(";")||"Sem descrição");
    salvarJSON(DATA.antecedentes,antecedentes);
    message.reply(`📝 Antecedente adicionado para ${user.tag}`);
    logEmbed(message.guild,"judiciario",message.author,user,`Antecedente adicionado`);
  }

  if(cmd==="verantecedentes"){
    const user=message.mentions.users.first(); if(!user) return message.reply("❌ Mencione o usuário.");
    if(!antecedentes[user.id] || antecedentes[user.id].length===0) return message.reply("✅ Sem antecedentes.");
    message.reply(`📜 Antecedentes de ${user.tag}:\n- ${antecedentes[user.id].join("\n- ")}`);
  }

  // ---------- AJUDA ----------
  if(cmd==="ajuda"){
    const embed=new EmbedBuilder()
      .setTitle("📜 Comandos LAGUNA ROLEPLAY")
      .setColor("#f1c40f")
      .setDescription(
        "**RG**\n"+
        "`!setrg Nome;Estado Civil;DD/MM/AAAA;Gênero` - Criar RG\n"+
        "`!rg` - Ver seu RG\n"+
        "`!consultar @user` - Consultar RG (polícia)\n"+
        "`!rgeditar @user Novo Nome` - Editar nome (staff)\n"+
        "`!rgdeletar @user` - Deletar RG (staff)\n\n"+
        "**ECONOMIA**\n"+
        "`!saldo` - Ver saldo\n"+
        "`!pagar @user valor` - Pagar outro usuário\n\n"+
        "**POLÍCIA / CNH / MANDADOS**\n"+
        "`!cassarcnh @user motivo` - Cassar CNH\n"+
        "`!liberarcnh @user` - Liberar CNH\n"+
        "`!mandado @user motivo` - Criar mandado judicial\n"+
        "`!addantecedente @user descrição` - Adicionar antecedente\n"+
        "`!verantecedentes @user` - Ver antecedentes"
      )
      .setFooter({text:"Enviado apenas para você via DM"}).setTimestamp();
    message.author.send({embeds:[embed]}).catch(()=>message.reply("❌ Não foi possível enviar DM."));
  }

});

// ---------- LOGIN ----------
client.login(process.env.TOKEN);
