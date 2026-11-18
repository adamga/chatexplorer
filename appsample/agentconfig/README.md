# Microsoft Foundry Agent Setup Guide (`agentconfig`)

Chronicle / Chat Explorer can generate portable session handoff summaries (`<session-name>-summary.md`) by sending a structured, token-optimized digest of a persisted VS Code chat session to an agent hosted in **Microsoft Foundry**.

You create and own the Microsoft Entra ID Service Principal and the Microsoft Foundry Agent in your Azure tenant, then enter those connection details into Chronicle's **Summary Agent Configuration** dialog (which persists them to your local `.env` file).

---

## Contents of this folder

| File | Purpose |
|---|---|
| [`README.md`](./README.md) | End-to-end setup guide for Microsoft Foundry Portal, Entra ID Service Principal, RBAC, and `.env` configuration |
| [`agent-instructions.md`](./agent-instructions.md) | Ready-to-copy **Agent Instructions (System Prompt)** and model/parameter recommendations for the Foundry Portal |

---

## Step 1 — Create the Agent in Microsoft Foundry Portal

1. Sign in to the **[Microsoft Foundry Portal](https://ai.azure.com)** and open (or create) your **Foundry project**.
2. Deploy a high-context text model in your project if you don't already have one:
   - **Recommended models:** `gpt-4.1`, `gpt-5-mini`, `gpt-5`, `o4-mini`, or `gpt-4o` (128k+ context window strongly recommended so large multi-turn coding sessions fit comfortably).
3. In the left navigation, select **Agents** → **+ New agent** (choose **Prompt agent** with default runtime).
4. Configure the agent with the settings from [`agent-instructions.md`](./agent-instructions.md):
   - **Agent name:** `chronicle-session-summarizer` *(must start/end with alphanumeric characters; hyphens allowed)*
   - **Description:** `Generates compact, comprehensive cross-machine handoff summaries (<session-name>-summary.md) from Chronicle VS Code chat session digests.`
   - **Model:** Select your deployed model (for example `gpt-4.1` or `gpt-5-mini`).
   - **Instructions:** Copy the full system prompt block from [`agent-instructions.md`](./agent-instructions.md) and paste it into the **Instructions** field.
   - **Tools / Knowledge / Actions:** **None required.** Leave all tools disabled — Chronicle extracts all prompts, responses, persisted reasoning, tool calls/results, and reconstructed file diffs locally and supplies them directly in the request input.
   - **Model parameters (if exposed for your chosen model):**
     - **Temperature:** `0.2` (for non-reasoning models; omit/default for reasoning models)
     - **Top P:** `0.95`
5. Save the agent and copy its **Agent Responses Endpoint URL** (or your **Foundry Project Endpoint URL** + **Agent Name**):
   - **Direct Agent Endpoint format (recommended):**
     ```text
     https://<your-foundry-resource>.services.ai.azure.com/api/projects/<your-project>/agents/chronicle-session-summarizer/endpoint/protocols/openai/responses?api-version=v1
     ```
   - **Alternative — Project Endpoint + Agent Name:**
     - Endpoint: `https://<your-foundry-resource>.services.ai.azure.com/api/projects/<your-project>`
     - Agent Name: `chronicle-session-summarizer`

---

## Step 2 — Create a Service Principal & Assign Azure RBAC

Microsoft Foundry Agent endpoints require **Microsoft Entra ID** bearer token authentication (`https://ai.azure.com/.default`). API keys are not used for Foundry Agent endpoints.

### 2.1 Create an App Registration & Client Secret

1. Open the **[Azure Portal](https://portal.azure.com)** → **Microsoft Entra ID** → **App registrations** → **+ New registration**.
2. Name it (for example `chronicle-session-summarizer-sp`), select **Accounts in this organizational directory only (Single tenant)**, and click **Register**.
3. On the app's **Overview** page, copy:
   - **Directory (tenant) ID** → `AZURE_TENANT_ID`
   - **Application (client) ID** → `AZURE_CLIENT_ID`
4. Go to **Certificates & secrets** → **Client secrets** → **+ New client secret**.
5. Enter a description and expiration, click **Add**, and immediately copy the secret **Value** *(not Secret ID)* → `AZURE_CLIENT_SECRET`.

### 2.2 Grant Access to the Foundry Project / Agent

Assign a least-privilege role so the Service Principal can invoke your Foundry Agent endpoint:

1. In the **Azure Portal**, navigate to your **Microsoft Foundry Project** resource (or parent Microsoft Foundry resource).
2. Select **Access control (IAM)** → **+ Add** → **Add role assignment**.
3. Select one of the following built-in roles:
   - **`Foundry Agent Consumer`** *(recommended least-privilege role for invoking agent endpoints)*, or
   - **`Foundry User`** *(formerly `Azure AI User` — required if using classic project-scoped agent APIs)*.
4. On the **Members** tab, choose **User, group, or service principal** → **+ Select members**, search for `chronicle-session-summarizer-sp`, select it, and click **Review + assign**.

> **Note:** Azure RBAC role assignments can take **1–5 minutes** to propagate before token authorization succeeds.

---

## Step 3 — Configure & Test in Chronicle

1. Launch Chronicle (`npm start` or `npm run desktop`).
2. Click **Summary agent** (gear/sliders button in the top bar, or click **Create session summary** on any session overview).
3. Enter your credentials and endpoint:
   - **Directory (Tenant) ID** (`AZURE_TENANT_ID`)
   - **Application (Client) ID** (`AZURE_CLIENT_ID`)
   - **Client Secret** (`AZURE_CLIENT_SECRET`)
   - **Foundry Agent Endpoint** (`FOUNDRY_AGENT_ENDPOINT`)
   - **Agent Name / ID** (`FOUNDRY_AGENT_NAME` — optional when the agent name is already embedded in the endpoint URL; required when entering a Project Endpoint URL)
   - **Summary Output Folder** (`SUMMARY_OUTPUT_DIR` — optional; defaults to `./summaries`)
4. Click **Save to `.env`**, then click **Test connection** to verify both Entra ID token acquisition and round-trip agent connectivity.
5. Open any session from the **Session library**, view **Session overview**, and click **Create session summary** (next to **Read full session**).

---

## `.env` Reference

Chronicle writes and reads these keys in your local `.env` file (which is git-ignored):

```dotenv
AZURE_TENANT_ID="00000000-0000-0000-0000-000000000000"
AZURE_CLIENT_ID="00000000-0000-0000-0000-000000000000"
AZURE_CLIENT_SECRET="your-client-secret-value"
FOUNDRY_AGENT_ENDPOINT="https://<resource>.services.ai.azure.com/api/projects/<project>/agents/chronicle-session-summarizer/endpoint/protocols/openai/responses?api-version=v1"
FOUNDRY_AGENT_NAME="chronicle-session-summarizer"
SUMMARY_OUTPUT_DIR="summaries"
```

---

## Troubleshooting

- **`401 Unauthorized` during Entra token request (`invalid_client`):** Verify you pasted the Client Secret **Value** rather than the Secret ID, and confirm `AZURE_TENANT_ID` and `AZURE_CLIENT_ID` match your App Registration.
- **`403 Forbidden` calling Foundry Agent endpoint:** Confirm the Service Principal has the **`Foundry Agent Consumer`** or **`Foundry User` (`Azure AI User`)** role assigned on the Foundry Project (using the Enterprise Application / Service Principal identity), and wait a few minutes for RBAC propagation.
- **`404 Not Found` calling Foundry Agent endpoint:** Check the resource name, project name, and agent name in `FOUNDRY_AGENT_ENDPOINT`, and ensure the agent has at least one saved version in the Foundry Portal.
