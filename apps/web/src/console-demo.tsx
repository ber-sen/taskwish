"use client";

import {
  Bot,
  Box,
  Check,
  ChevronDown,
  CirclePlay,
  Database,
  GitBranch,
  MoreHorizontal,
  Play,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";

type ActorKey = "CustomerSupport" | "SalesOps" | "Finance";
type Tab = "Actions" | "State" | "Events";

const actors = {
  CustomerSupport: {
    description: "Resolves customer requests across support channels.",
    actions: [
      { name: "resolveTicket", kind: "CMD", description: "Research a customer issue and propose a resolution.", tools: 3, input: "ticket_1842" },
      { name: "onTicketOpened", kind: "EVT", description: "Triages new tickets and assigns the right specialist.", tools: 2, input: "ticket_1921" },
    ],
    steps: ["loadCustomerContext", "searchKnowledgeBase", "draftResolution"],
    output: "Resolution drafted and queued for approval.",
    state: { openTickets: 18, resolvedToday: 43, escalationRate: "4.2%" },
    events: ["TicketOpened", "ResolutionDrafted", "TicketEscalated"],
  },
  SalesOps: {
    description: "Qualifies opportunities and coordinates follow-up.",
    actions: [
      { name: "qualifyLead", kind: "CMD", description: "Research and score a new inbound lead.", tools: 4, input: "lead_730" },
      { name: "onDemoRequested", kind: "EVT", description: "Prepares context and assigns an account owner.", tools: 3, input: "demo_221" },
    ],
    steps: ["enrichCompany", "scoreOpportunity", "assignOwner"],
    output: "Lead qualified at 87/100 and assigned to Maya.",
    state: { activeLeads: 126, qualifiedToday: 21, pipeline: "$284k" },
    events: ["LeadQualified", "OwnerAssigned", "DemoRequested"],
  },
  Finance: {
    description: "Monitors spend, invoices, and financial operations.",
    actions: [
      { name: "reviewInvoice", kind: "CMD", description: "Validate an invoice against policy and purchase orders.", tools: 3, input: "inv_0938" },
      { name: "onSpendAlert", kind: "EVT", description: "Investigates spend anomalies and routes approvals.", tools: 2, input: "alert_044" },
    ],
    steps: ["loadInvoice", "checkPolicy", "prepareDecision"],
    output: "Invoice approved. No policy exceptions found.",
    state: { pendingInvoices: 9, approvedToday: 17, exceptions: 2 },
    events: ["InvoiceReceived", "InvoiceApproved", "SpendAlerted"],
  },
} as const;

export function ConsoleDemo() {
  const [actorName, setActorName] = useState<ActorKey>("CustomerSupport");
  const [tab, setTab] = useState<Tab>("Actions");
  const [actionIndex, setActionIndex] = useState(0);
  const [input, setInput] = useState<string>(actors.CustomerSupport.actions[0].input);
  const [query, setQuery] = useState("");
  const [completedSteps, setCompletedSteps] = useState(0);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const actor = actors[actorName];
  const action = actor.actions[actionIndex] ?? actor.actions[0];

  const visibleActors = useMemo(
    () => (Object.keys(actors) as ActorKey[]).filter((name) => name.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  function chooseActor(name: ActorKey) {
    setActorName(name);
    setActionIndex(0);
    setInput(actors[name].actions[0].input);
    setCompletedSteps(0);
    setOutput(null);
    setTab("Actions");
  }

  function chooseAction(index: number) {
    setActionIndex(index);
    setInput(actor.actions[index].input);
    setCompletedSteps(0);
    setOutput(null);
  }

  async function runAction() {
    if (running || !input.trim()) return;
    setRunning(true);
    setOutput(null);
    setCompletedSteps(0);
    for (let index = 1; index <= actor.steps.length; index++) {
      await new Promise((resolve) => window.setTimeout(resolve, 520));
      setCompletedSteps(index);
    }
    setOutput(actor.output);
    setRunning(false);
  }

  return (
    <div className="console-stage" aria-label="Interactive preview of the TaskWish Console">
      <div className="console-glow" />
      <div className="console-window">
        <div className="console-topbar">
          <div className="console-wordmark"><Mark /><span>TaskWish Console</span></div>
          <label className="console-search">
            <Search size={13} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search actors" aria-label="Search actors" />
            <kbd>⌘ K</kbd>
          </label>
          <div className="console-status"><i /> Local</div>
        </div>

        <div className="console-body">
          <aside className="console-sidebar">
            <div className="workspace-select"><span>Acme Operations</span><ChevronDown size={13} /></div>
            <span className="console-nav-label">Actors</span>
            {visibleActors.map((name) => (
              <button key={name} className={actorName === name ? "console-nav active" : "console-nav"} onClick={() => chooseActor(name)}>
                <span><Box />{name}</span><small>{actors[name].actions.length}</small>
              </button>
            ))}
            <span className="console-nav-label console-tools-label">Workspace</span>
            <div className="console-nav"><span><CirclePlay />Runs</span><small>12</small></div>
            <div className="console-nav"><span><GitBranch />Events</span><small>8</small></div>
            <div className="console-nav"><span><Database />State</span></div>
            <div className="console-sidebar-bottom"><span className="console-nav-label">Runtime</span><div><i /> Server connected</div><small>localhost:49182</small></div>
          </aside>

          <section className="console-content">
            <div className="console-page-head">
              <div className="actor-avatar"><Bot size={20} /></div>
              <div><span>Actor</span><h3>{actorName}</h3><p>{actor.description}</p></div>
              <button aria-label="More options"><MoreHorizontal size={18} /></button>
            </div>

            <div className="console-tabs" role="tablist">
              {(["Actions", "State", "Events"] as Tab[]).map((item) => (
                <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)} role="tab" aria-selected={tab === item}>{item}</button>
              ))}
            </div>

            {tab === "Actions" && <>
              <div className="action-grid">
                {actor.actions.map((item, index) => (
                  <button key={item.name} className={actionIndex === index ? "action-card selected" : "action-card"} onClick={() => chooseAction(index)}>
                    <div><span className={`method ${item.kind === "CMD" ? "command" : "event"}`}>{item.kind}</span><h4>{item.name}</h4></div>
                    <p>{item.description}</p><span className="tool-count">{item.tools} tools</span>
                  </button>
                ))}
              </div>
              <div className="run-panel">
                <div className="run-panel-head"><div><span>Run action</span><strong>{actorName}::{action.name}</strong></div><button onClick={runAction} disabled={running || !input.trim()}><Play size={13} fill="currentColor" /> {running ? "Running" : "Run"}</button></div>
                <label htmlFor="demo-input">{action.kind === "CMD" ? "resourceId" : "eventId"}</label>
                <input id="demo-input" className="mock-input" value={input} onChange={(event) => setInput(event.target.value)} />
                <div className="run-stream">
                  {actor.steps.map((name, index) => {
                    const done = completedSteps > index;
                    const active = running && completedSteps === index;
                    return <StreamRow key={name} status={done ? "done" : active ? "active" : "waiting"} name={name} time={done ? `${38 + index * 91}ms` : active ? "Running" : "Waiting"} />;
                  })}
                </div>
                {output && <div className="run-output"><Check size={13} /><span>{output}</span></div>}
              </div>
            </>}

            {tab === "State" && <div className="console-data-panel"><span>Live actor state</span><pre>{JSON.stringify(actor.state, null, 2)}</pre></div>}
            {tab === "Events" && <div className="console-data-panel"><span>Event subscriptions</span>{actor.events.map((event, index) => <div className="event-row" key={event}><GitBranch size={13} /><code>{actorName}::{event}</code><small>{index === 0 ? "2s ago" : `${index + 2}m ago`}</small></div>)}</div>}
          </section>
        </div>
      </div>
    </div>
  );
}

function Mark() {
  return <svg viewBox="0 0 50 19" aria-hidden="true"><path d="M25.142 3.414 9.091 19 0 10.172l3.516-3.413 5.575 5.413L21.626 0l3.516 3.414Z"/><path opacity=".28" d="M33.949 19 50 3.414 46.484 0 33.95 12.172l-5.575-5.413-3.516 3.413L33.95 19Z"/></svg>;
}

function StreamRow({ status, name, time }: { status: "done" | "active" | "waiting"; name: string; time: string }) {
  return <div className="stream-row"><span className={status}>{status === "done" ? <Check size={11} /> : <i />}</span><code>{name}</code><small>{time}</small></div>;
}
