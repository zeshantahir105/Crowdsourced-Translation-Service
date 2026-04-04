# How to use LingoHub — user guide

LingoHub helps you get **AI-assisted translations** and optionally pass them through a **human workflow** (edit, review, approve). This guide is written for **people using the website**, not for engineers.

---

## What kind of account you have

When you sign up, you pick a **role**. That controls what you can do:

| Role | What you typically do |
|------|------------------------|
| **Consumer** | Create translation jobs (text or files), read the AI draft, edit the translation yourself, and track your requests. |
| **Translator** | Pick up **translation** tasks from the task list, refine the text in the editor, and submit your version. |
| **Reviewer** | When a job is ready for review, **rate** the latest submitted translation and add optional comments. |
| **Admin** | Manage users and plans for your organization (only certain accounts). |

Some people wear more than one hat if your organization set it up that way.

---

## Creating your account and signing in

### Sign up with email

1. Open **Register** from the site.
2. Enter your details and choose your **role**.
3. Submit the form. You should receive a **verification code by email** (check spam). If nothing arrives, your organization may need to fix email delivery—contact whoever runs LingoHub for you.
4. Open **Verify email**, enter the code, then sign in on **Log in**.

You **cannot** sign in with email until the address is verified.

### Sign in with Google

Use the **Google** option on the log-in page. Google accounts are treated as already verified.

### If you forgot your password

1. Open **Forgot password** and enter your email.
2. Use the link or code from the email on **Reset password** to choose a new password.

---

## Free vs Premium

**Free** and **Premium** differ in **file types**, **maximum upload size per file**, and **how many characters** we allow from extracted document text (and the same idea applies to pasted text in the Translator). Your organization can change the numbers via server configuration; the **Translate files** page loads the live limits from the server so what you see there is what is enforced.

**Typical defaults** (unless your host changed them):

| | Free | Premium |
|---|------|---------|
| **Document file types** | `.txt` | `.txt`, `.docx`, `.pdf` |
| **Max upload size** | 256 KB per file | 10 MB per file |
| **Max text (extracted or pasted)** | 5,000 characters | 100,000 characters |

To upgrade, open **Pricing** and complete checkout with your card (handled securely by **Stripe**). Your **Account** page shows whether you are on Free or Premium.

---

## Translator page — type text and get an instant draft

1. **Sign in.** The live draft and “send to workflow” need an account.
2. Choose a **domain** (for example General, Legal, or Marketing). This nudges the AI toward the right tone.
3. Choose **source language** and **target language**. You can set the source to **Detect language** if you are not sure what the original is.
4. Type or paste text on the **left**. After a short pause, a **draft translation** appears on the **right**.
5. If you use a **personal glossary**, matching terms may show as **hints** below—useful for names and fixed phrases.
6. Tap **Refresh** if you want to regenerate the draft after big edits.
7. Use the **swap** arrow to flip source and target (for example to compare both directions).
8. When you are happy enough to start the official workflow, choose **Send to workflow**. That creates a **job** you can open from the **Dashboard**.

If something is wrong with the translation service, the app will tell you in plain language. You can still type your own text on the right or try again later.

---

## Translate files (documents)

1. **Sign in** and open **Translate files** (or **Documents**) from the navigation.
2. Read the short explanation on the page: after upload you will land on the **job page** for that file.
3. Pick **languages** and **domain**, then choose your file.
4. Press **Upload & start workflow**.

**Important:** A large PDF can take **several minutes**. You will see a **full-screen “working on your file”** message—**stay on that screen** until it finishes. Closing the tab too early can interrupt the process.

**Where to read the result:** On the job page, **Source** is the text extracted from your file. **Human translation** is the rich editor where the **machine translation** appears so you can edit it. There is also an **AI draft** section as a read-only copy.

**Scanned PDFs** that are only pictures (no real text inside) may not work—there is nothing for the system to read. Use a file with selectable text, or ask your organization about OCR tools outside LingoHub.

---

## Dashboard — your jobs

Open **Dashboard** to see **translation requests you created**. Select one to open its **job page** and continue editing, check status, or see history.

The list may update on its own when something changes; if not, **refresh the page**.

---

## Job page — one translation request in detail

### Source

The **original text**—either what you pasted or what was **pulled out of an uploaded file**.

### AI draft

A **read-only** machine translation for reference. If the service had a problem, this area is **highlighted** and explains that the automatic translation did not complete normally.

### Human translation (editor)

This is where **you** improve the text.

- If you **created** the job, you can usually edit here and **submit** your version.
- **Translators** working on the job use the same editor to submit a **version** for review.

The editor starts from the **latest saved human version**, or from the **AI draft** if nobody has submitted yet.

### Versions

A **history** of submitted texts and any **scores** from reviewers.

### Quality review

If your role is **Reviewer** (or Admin), and the job is in **review**, you can **rate** the latest version and leave comments. That helps close out the workflow for the requester.

---

## Tasks — work waiting for translators and reviewers

Open **Tasks** to see **open work**:

- **Translate** — open the linked job, edit in **Human translation**, then **Submit version**.
- **Review** — open the job and complete the **review** section when it is available.

---

## Glossary — your preferred terms

In **Glossary**, add pairs like **source term** → **how you want it translated**, plus optional **notes**.

- While you translate on the **Translator** page, the app may **highlight** glossary hits in your source text.
- On **job pages**, people working on **your** request may see hints based on **your** glossary.

---

## Pricing and payments

**Pricing** compares plans. Buying **Premium** sends you through a secure **Stripe** checkout. After payment, your **Account** page should show Premium; if it lags, wait a moment or refresh—your organization’s setup may also sync purchases in the background.

---

## Developer tools (API keys)

If your plan includes **API access**, **Developer** in the menu lets you create **API keys** and see simple usage information. This is mainly for **building integrations** (other apps calling LingoHub). Follow the examples on that screen, or ask your technical team for help.

---

## Administrator tools

Only **administrator** accounts see **Admin**. From there, your organization manages users and plans.

---

## When things go wrong — simple checks

| What you see | What to try |
|--------------|-------------|
| Message that the **translation service** is not working | Wait and try again. If it persists, the service your organization connects to may be down or misconfigured—contact **support** or your **IT team**. |
| **Upload** never finishes | Very large PDFs take time; keep the tab open. Try a **smaller file** or a **.txt** export to test. |
| **No draft** or empty editor on a job | Refresh the page. If the job just started, wait a few seconds. |
| **Verification email** never arrives | Check spam; confirm the email address; ask your organization to verify **email sending** is set up. |
| List or job looks **out of date** | Refresh the browser. |

---

## Getting more technical help

If you need **setup for your company** (servers, security, integrations), ask your **IT or engineering team**. They can use **[DEVELOPERS.md](DEVELOPERS.md)** (setup and deployment) and **[IMPLEMENTATION.md](IMPLEMENTATION.md)** (detailed technical mapping) in the product repository.

---

*LingoHub — AI drafts plus human review for translations.*
