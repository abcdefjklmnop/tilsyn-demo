"use strict";

// Demonstration only. State stays in memory; no storage, network, or AI calls.
const definitions = [
  {id:"contact",title:"Søvn og kontakt",hint:"Beskriv det du observerte. Søvn sier ikke i seg selv noe om smerter.",choices:[
    {id:"awake",label:"Våken",text:"Pasienten var våken ved tilsynet."},
    {id:"sleep",label:"Sov – ikke vekket",text:"Pasienten sov ved tilsynet og ble ikke vekket."},
    {id:"unassessed",label:"Ikke vurdert",text:"Søvn og kontakt ble ikke vurdert."}]},
  {id:"comfort",title:"Smerter og ubehag",hint:"Skill mellom det pasienten forteller og det du selv observerer.",choices:[
    {id:"none",label:"Oppgir ingen smerter",text:"Pasienten oppga ingen smerter."},
    {id:"reported",label:"Oppgir smerter / ubehag",text:"Pasienten oppga smerter eller ubehag.",detail:"Hva oppga pasienten? Beskriv med egne ord."},
    {id:"observed",label:"Observerte tegn til ubehag",text:"Det ble observert tegn til ubehag.",detail:"Beskriv det du faktisk observerte."},
    {id:"unassessed",label:"Ikke vurdert",text:"Smerter og ubehag ble ikke vurdert."}]},
  {id:"care",title:"Hjelp som ble utført",hint:"Du kan velge flere handlinger. Tilbudt drikke betyr ikke at pasienten drakk.",multi:true,choices:[
    {id:"none",label:"Ingen hjelp utført",text:"Ingen hjelp ble utført under tilsynet.",exclusive:true},
    {id:"drink",label:"Tilbudt drikke",text:"Pasienten ble tilbudt drikke."},
    {id:"position",label:"Hjulpet med stillingsendring",text:"Pasienten fikk hjelp til stillingsendring."},
    {id:"other",label:"Annen hjelp",text:"Annen hjelp ble utført.",detail:"Beskriv hjelpen som ble utført."}]},
  {id:"followup",title:"Videre oppfølging",hint:"Registrer hva som faktisk er avtalt eller fortsatt er uavklart.",choices:[
    {id:"none",label:"Ingen oppfølging planlagt",text:"Ingen videre oppfølging ble planlagt ved dette tilsynet."},
    {id:"planned",label:"Oppfølging avtalt",text:"Videre oppfølging er avtalt.",detail:"Hva er avtalt, med hvem og når? Bruk fiktive opplysninger."},
    {id:"unknown",label:"Ikke avklart",text:"Videre oppfølging var ikke avklart ved dokumentasjonen."}]}
];
const $ = id => document.getElementById(id);
const state = {answers:{},details:{},kind:"Tilsyn",confirmed:false,finalText:""};
const localNow = () => {const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
function selected(question){return (state.answers[question.id]||[]).map(id=>question.choices.find(c=>c.id===id));}
function renderQuestions(){
  for(const [i,q] of definitions.entries()){
    const section=document.createElement("section");section.className="question";section.id=`question-${q.id}`;
    const heading=document.createElement("h3");heading.className="question-title";heading.id=`title-${q.id}`;heading.style.margin="0";
    const number=document.createElement("span");number.className="number";number.textContent=String(i+1);heading.append(number,document.createTextNode(q.title));
    const hint=document.createElement("p");hint.className="hint";hint.id=`hint-${q.id}`;hint.textContent=q.hint;
    const group=document.createElement("div");group.className="choices";group.setAttribute("role","group");group.setAttribute("aria-labelledby",heading.id);group.setAttribute("aria-describedby",hint.id);
    section.append(heading,hint,group);
    for(const choice of q.choices){
      const button=document.createElement("button");button.type="button";button.className="choice";button.id=`choice-${q.id}-${choice.id}`;button.textContent=choice.label;button.setAttribute("aria-pressed","false");
      button.addEventListener("click",()=>choose(q,choice));group.append(button);
      if(choice.detail){
        const label=document.createElement("label");label.className="field-label detail-label";label.id=`detail-wrap-${q.id}-${choice.id}`;label.hidden=true;label.textContent=choice.detail;
        const input=document.createElement("textarea");input.rows=3;input.maxLength=900;input.id=`detail-${q.id}-${choice.id}`;label.htmlFor=input.id;
        input.addEventListener("input",()=>{state.details[`${q.id}-${choice.id}`]=input.value;update();});label.append(input);section.append(label);
      }
    }
    $("questions").append(section);
  }
}
function choose(q,choice){
  if(state.confirmed)return;
  const old=state.answers[q.id]||[];
  if(q.multi){state.answers[q.id]=choice.exclusive ? (old.includes(choice.id)?[]:[choice.id]) : (old.includes(choice.id)?old.filter(id=>id!==choice.id):[...old.filter(id=>!q.choices.find(c=>c.id===id).exclusive),choice.id]);}
  else state.answers[q.id]=old.includes(choice.id)?[]:[choice.id];
  for(const c of q.choices){
    const active=state.answers[q.id].includes(c.id);$( `choice-${q.id}-${c.id}` ).setAttribute("aria-pressed",String(active));
    if(c.detail){$(`detail-wrap-${q.id}-${c.id}`).hidden=!active;if(!active){delete state.details[`${q.id}-${c.id}`];$(`detail-${q.id}-${c.id}`).value="";}}
  }
  update();
}
function validTime(){return $("visit-time").value && !Number.isNaN(new Date($("visit-time").value).getTime());}
function timeLabel(){return validTime()?new Intl.DateTimeFormat("nb-NO",{dateStyle:"medium",timeStyle:"short"}).format(new Date($("visit-time").value)):"Tidspunkt mangler";}
function buildNote(){
  const lines=[`DEMONSTRASJON — IKKE JOURNALFØRT`,`Demopasient A · ID DEMO-001`,`${state.kind} · Observasjon: ${timeLabel()}`,""];
  let count=0;
  for(const q of definitions){
    const choices=selected(q);
    if(!choices.length){lines.push(`${q.title}: ikke registrert.`);continue;}
    count++;
    for(const c of choices){let line=c.text;if(c.detail){const detail=(state.details[`${q.id}-${c.id}`]||"").trim();line+=detail?` ${detail}`:" [Beskrivelse mangler]";}lines.push(line);}
  }
  const extra=$("extra").value.trim();if(extra)lines.push("",`Andre opplysninger: ${extra}`);
  if(!count&&!extra)lines.push("","Valgene dine vil vises her. Ubesvarte punkter tolkes aldri som normale funn.");
  return lines.join("\n");
}
function errors(){
  const list=[];
  if(!$("identity").checked)list.push({message:"Bekreft at riktig demopasient er valgt.",target:"identity"});
  if(!validTime())list.push({message:"Angi tidspunkt for observasjonen.",target:"visit-time"});
  for(const q of definitions){
    const choices=selected(q);
    if(!choices.length)list.push({message:`Besvar «${q.title}».`,target:`choice-${q.id}-${q.choices[0].id}`});
    for(const c of choices){if(c.detail&&!(state.details[`${q.id}-${c.id}`]||"").trim())list.push({message:`Legg til beskrivelse under «${q.title}».`,target:`detail-${q.id}-${c.id}`});}
  }
  if((state.answers.contact||[]).includes("sleep")&&["none","reported"].some(id=>(state.answers.comfort||[]).includes(id))){list.push({message:"Kontroller svarene: «Sov – ikke vekket» og et muntlig smerteutsagn gjelder ikke samme kontakt. Skill tidspunktene eller korriger valget.",target:"choice-comfort-unassessed"});}
  return list;
}
function update(){
  if(state.confirmed)return;
  const count=definitions.filter(q=>selected(q).length>0).length;
  $("progress").value=count;$("progress-label").textContent=`${count} av 4 punkter besvart`;$("progress-percent").textContent=`${Math.round(count/4*100)} %`;
  $("note-preview").textContent=buildNote();
  $("followup-reminder").hidden=!(state.answers.followup||[]).some(id=>["planned","unknown"].includes(id));
  const status=$("completion-status");status.className="status-line";status.textContent=errors().length?"Utkastet er ikke ferdig. Kontroller punktene før gjennomgang.":"Alle punktene er besvart. Les gjennom og rett utkastet.";
}
function review(){
  const problems=errors();
  if(problems.length){$("completion-status").textContent=problems[0].message;$("completion-status").className="status-line error";$(problems[0].target).focus();return;}
  $("review-text").value=buildNote();$("review-confirm").checked=false;$("review-error").textContent="";$("review-dialog").showModal();
}
function confirm(){
  if(!$("review-text").value.trim()){$("review-error").textContent="Utkastet kan ikke være tomt.";$("review-text").focus();return;}
  if(!$("review-confirm").checked){$("review-error").textContent="Bekreft at du har kontrollert opplysningene.";$("review-confirm").focus();return;}
  state.confirmed=true;state.finalText=$("review-text").value.trim();$("note-preview").textContent=state.finalText;
  $("note-status").textContent="Gjennomgått";$("note-status").classList.add("confirmed");
  $("completion-status").textContent="Gjennomgått i demo. Notatet er ikke signert, lagret eller sendt til pasientjournalen.";$("completion-status").className="status-line success-status";
  document.querySelectorAll(".workspace input, .workspace textarea, .workspace button").forEach(el=>el.disabled=true);document.body.classList.add("is-locked");
  $("review-button").disabled=true;$("review-button").textContent="Gjennomgått i demo";$("review-dialog").close();$("reset-button").focus();
}
function reset(){
  state.answers={};state.details={};state.kind="Tilsyn";state.confirmed=false;state.finalText="";
  document.querySelectorAll(".workspace input, .workspace textarea, .workspace button").forEach(el=>el.disabled=false);document.body.classList.remove("is-locked");
  document.querySelectorAll(".workspace textarea").forEach(el=>el.value="");document.querySelectorAll(".choice").forEach(el=>el.setAttribute("aria-pressed","false"));document.querySelectorAll(".detail-label").forEach(el=>el.hidden=true);
  $("identity").checked=false;$("visit-time").value=localNow();
  document.querySelectorAll("[data-kind]").forEach(el=>{el.classList.toggle("selected",el.dataset.kind===state.kind);el.setAttribute("aria-pressed",String(el.dataset.kind===state.kind));});
  $("review-text").value="";$("review-confirm").checked=false;$("note-status").textContent="Utkast";$("note-status").classList.remove("confirmed");$("review-button").disabled=false;$("review-button").textContent="Gjennomgå utkast →";
  $("reset-dialog").close();update();$("identity").focus();
}
renderQuestions();$("visit-time").value=localNow();
for(const id of ["identity","visit-time","extra"])$(id).addEventListener("input",update);
document.querySelectorAll("[data-kind]").forEach(el=>el.addEventListener("click",()=>{if(state.confirmed)return;state.kind=el.dataset.kind;document.querySelectorAll("[data-kind]").forEach(button=>{button.classList.toggle("selected",button===el);button.setAttribute("aria-pressed",String(button===el));});update();}));
$("review-button").addEventListener("click",review);$("confirm-button").addEventListener("click",confirm);$("close-review").addEventListener("click",()=>$("review-dialog").close());
$("about-button").addEventListener("click",()=>$("about-dialog").showModal());$("close-about").addEventListener("click",()=>$("about-dialog").close());
$("reset-button").addEventListener("click",()=>$("reset-dialog").showModal());$("cancel-reset").addEventListener("click",()=>$("reset-dialog").close());$("confirm-reset").addEventListener("click",reset);
update();
