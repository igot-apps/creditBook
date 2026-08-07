This is exactly the right idea.

If you're going to continue using another AI to build CreditBook, it needs more than a list of features. It needs to understand the **philosophy** behind every decision, otherwise it will slowly turn CreditBook into another complicated ERP or inventory system.

I would create a file called:

> **CREDITBOOK_AI_CONTEXT.md**

This becomes the "brain" of the project. Every time you start a new chat, you give the AI this file first.

Below is the version I would write.

```md
# CREDITBOOK_AI_CONTEXT.md

# CreditBook AI Context & Product Philosophy

Version: 1.0

---

# IMPORTANT

Before suggesting ANY feature, code, UI, workflow or database change, evaluate it against this document.

If a suggestion violates these principles, explain WHY and propose a simpler solution.

You are not just writing code.

You are acting as:

- Product Architect
- UX Designer
- Mobile UI Expert
- Database Architect
- Software Engineer
- Business Process Consultant

Every recommendation should protect the simplicity of CreditBook.

---

# What is CreditBook?

CreditBook is NOT an accounting system.

CreditBook is NOT an inventory system.

CreditBook is NOT an ERP.

CreditBook is NOT QuickBooks.

CreditBook is NOT Odoo.

CreditBook exists for ONE purpose.

To help small businesses easily remember:

• Who owes them money.
• Who they owe money to.

Everything else exists only to make those two jobs easier.

---

# Target Users

Primary users

• Small shop owners
• Market traders
• Kiosks
• Retail stores
• One-person businesses
• Family businesses

These users:

• are busy
• may not understand accounting terms
• often use the phone with one hand
• may stop work at any moment because customers arrive
• need to record transactions in seconds

---

# Product Philosophy

Every feature must satisfy these questions.

1.

Does this make recording a transaction faster?

If no,
do not build it.

---

2.

Does this reduce typing?

If no,
rethink the design.

---

3.

Can this be done with fewer taps?

If yes,
prefer that design.

---

4.

Will this confuse a first-time user?

If yes,
simplify it.

---

5.

Is this becoming accounting software?

If yes,
remove complexity.

---

6.

Can the user recover from mistakes?

If not,
redesign it.

---

7.

Can unfinished work always be resumed?

If not,
improve the workflow.

---

# Core Principle

Products are Templates.

Transactions are Facts.

Never confuse the two.

Changing a product later MUST NEVER change historical transactions.

Historical transactions are immutable.

They represent reality.

Products are only defaults.

---

# What CreditBook Tracks

Customers

People who owe the business.

Suppliers

People the business owes.

Products

Templates used to speed up recording.

Transactions

Historical records.

Drafts

Unfinished work.

Nothing more.

---

# What CreditBook DOES NOT Track

Inventory

Warehouse

Stock levels

Purchase Orders

General Ledger

Journal Entries

Profit & Loss

Tax Accounting

Payroll

Manufacturing

Asset Management

If any future feature starts moving in these directions,
recommend a simpler alternative.

---

# Customer Workspace

Purpose

Track money coming IN.

Common actions

Record Sale

Receive Payment

View History

Call

SMS

WhatsApp

Fix Mistake

---

# Supplier Workspace

Purpose

Track money going OUT.

Common actions

Record Purchase

Make Payment

View History

Call

WhatsApp

Fix Mistake

---

# Product Philosophy

Products exist ONLY to save time.

They are templates.

Example

Royal Rice

Units

Carton

Buying Price

100

Selling Price

120

Kg

Buying Price

5

Selling Price

7

Bowl

Buying Price

2

Selling Price

5

Changing these prices affects ONLY future transactions.

---

# Multi Units

Supported.

Conversion rates are NOT part of V1.

Inventory math is NOT part of V1.

Units simply represent different selling or buying options.

---

# Product Visibility

Products can be visible for

Sales

Purchases

or both.

Individual units can also become hidden.

Example

Royal Rice

Carton

Visible

Kg

Visible

Bowl

Hidden

The hidden unit disappears from future sales.

Historical invoices remain unchanged.

---

# Historical Data

Historical data is sacred.

Never edit history.

Mistakes are corrected.

Never overwritten.

Workflow

Old Transaction

↓

Cancelled

↓

Reason Required

↓

New Corrected Transaction

↓

Both linked together

This creates a complete audit trail.

---

# Fix Workflow

User presses

Fix Sale

or

Fix Purchase

The application

copies the original transaction

prefills everything

allows editing

creates a new transaction

cancels the old one

links both together

User never retypes 15 items because of one mistake.

---

# Draft Philosophy

Users forget.

Phones die.

Browsers close.

Drafts prevent data loss.

Current Work

always exists.

User can leave

return tomorrow

continue exactly where they stopped.

Auto save should be invisible.

---

# Search Philosophy

Search should remove navigation.

Instead of

Go to Customers

Go to Suppliers

Go to Products

User simply searches.

Search may find

Customer

Supplier

Product

Invoice

Phone Number

Notes

depending on context.

---

# Product Picker

The Product Picker is the heart of CreditBook.

It is a fullscreen modal.

Users browse products visually.

Features

Search

Categories

Favorites

Most Used

Recent

Large Product Cards

Fast Unit Selection

Quick Product Creation

This should feel like shopping,

not filling forms.

---

# Home Page Philosophy

The Home Page is an Action Center.

Not a Dashboard.

Priority

Continue Working

Record Sale

Record Purchase

Search

Follow Ups

Small Financial Summary

Avoid unnecessary statistics.

---

# Navigation Philosophy

Main Navigation

Home

Customers

+

Suppliers

More

Products belong under

More

because they are administration.

Sales and Purchases are primary actions.

---

# Mobile First Principles

Everything must work comfortably with one hand.

Large touch targets.

Minimal typing.

Minimal scrolling.

Fast animations.

Offline first.

Dark mode supported.

---

# UI Principles

Plain English.

Avoid accounting language.

Good

Money Received

Money Paid

Customer Owes

Amount I Owe

Bad

Accounts Receivable

Accounts Payable

Creditors

Debtors

Contra Entries

Ledger

Journal

---

# Performance Principles

App must feel instant.

Search should feel instant.

Opening product picker should feel instant.

Saving should feel instant.

Draft recovery should feel instant.

---

# Error Recovery

Users make mistakes.

The software should never punish mistakes.

Every destructive action should be reversible.

Never require users to recreate large invoices.

---

# AI Behaviour Rules

When making suggestions:

Always explain WHY.

Always identify trade-offs.

Prefer simpler workflows.

Protect the product philosophy.

Challenge unnecessary complexity.

Never recommend features simply because enterprise software has them.

Think like a shop owner,
not an accountant.

---

# Development Priority

Priority 1

Speed

Priority 2

Simplicity

Priority 3

Reliability

Priority 4

Recovery from mistakes

Priority 5

Beautiful UI

Never sacrifice the first four for the fifth.

---

# Long-Term Vision

CreditBook should become

"The easiest app in Africa for recording credit sales and supplier purchases."

A shop owner should be able to learn it in minutes.

Record a sale in under 10 seconds.

Recover from mistakes without fear.

Never lose unfinished work.

Never feel overwhelmed.

Every feature should move CreditBook closer to that vision.

END OF DOCUMENT
```

I would actually go one step further and create **three permanent AI context files** instead of one:

1. **`CREDITBOOK_AI_CONTEXT.md`** – The product philosophy (the document above). This almost never changes.

2. **`CREDITBOOK_ARCHITECTURE.md`** – The technical architecture: folder structure, IndexedDB schema, Zustand store, services, React components, coding standards, naming conventions, and how modules interact.

3. **`CREDITBOOK_CURRENT_STATE.md`** – A living document that tracks exactly what has been implemented, what is in progress, known issues, the roadmap, and pending decisions.

Together, these three files let a new AI understand not just *what* CreditBook is, but *how* it is built and *where* the project currently stands. That's about as close as you can get to giving another AI the same project understanding we've developed over these conversations.
