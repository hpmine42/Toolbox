# Toolbox — Persistent Arena Instructions

These are the persistent development guidelines for **Toolbox**. Consult this document before every future Arena task, and follow it unless a task explicitly overrides a point.

When a task conflicts with these instructions, follow the explicit task requirement, but preserve privacy, security, accessibility, and existing functionality wherever possible.

## Project

Toolbox is an open-source web application: a collection of small, practical web tools.

Examples include an outdoor tracker (Draußen-Tracker), a timer, a random generator, a unit converter, text tools, a calculator, and other utilities.

The application is expected to grow over time. New tools must be easy to add without unnecessarily rebuilding the existing architecture.

## Guiding principles

- Keep the application simple, fast, and focused.
- Every tool should have a clear purpose.
- Avoid unnecessary features.
- Avoid unnecessary dependencies.
- Prefer simple, maintainable solutions over clever abstractions.
- Reuse components and utilities where that genuinely improves consistency.
- Do not introduce architecture solely for hypothetical future requirements.
- Do not break existing functionality when adding new tools.
- Never silently remove existing functionality.
- Keep tools as independent as reasonably possible.

## Technology

Use:

- React
- TypeScript
- Vite
- CSS
- GitHub Pages
- i18next and react-i18next

Prefer browser-native APIs whenever practical.

Internationalization is mandatory from the first implementation. See [Internationalization](#internationalization). Do not defer it, and do not replace i18next with a custom solution or another library.

The application should primarily run client-side. Do not introduce a backend, database, authentication, or external service unless a future task explicitly requires it.

Never place secrets or private credentials in frontend code.

## Internationalization

This rule is binding from the start of the project.

The application must use a real i18n system based on **i18next** and **react-i18next**. This is a required dependency. It overrides the general preference to avoid extra dependencies, and it is an explicit extension point rather than speculative architecture.

Supported languages at first:

- German (`de`)
- English (`en`)

German is the default language.

On first start, detect the browser language. Use it when it matches a supported language, including regional variants such as `de-DE` or `en-US`. Otherwise use German.

Provide a manual language switch in the application settings. Persist the selected language locally, and use that stored choice on later visits instead of detecting the browser language again.

All visible UI text must go through i18next. Do not hardcode user-facing text in components or tools. This includes headings, labels, buttons, placeholders, tool names and descriptions shown in the catalog, empty, loading, and error states, and accessible names.

Manage translations centrally in `de.json` and `en.json`, one file per language. Every new tool or UI string must be added to both files in the same change. A feature is not complete if either language is missing that text.

Design the setup so further languages can be added later without rewriting components or tools. Adding a language should mean adding its translation file and registering the locale in one place. Do not branch component copy on specific language codes.

## Privacy

Privacy is a core project principle.

By default, do not add:

- analytics
- tracking
- advertising
- unnecessary cookies
- user accounts
- unnecessary data collection
- unnecessary external requests

If a tool can work entirely in the browser, prefer that implementation.

If a future tool requires an external API or service, clearly document what data leaves the browser and why.

## UI and UX

The interface should feel like a polished utility application, not a generic website.

Priorities, in order:

1. Usability
2. Clarity
3. Performance
4. Accessibility
5. Visual polish

Design requirements:

- Mobile-first
- Fully responsive
- Excellent touch interaction
- Also works well on desktop
- Clear typography
- Consistent spacing
- Strong visual hierarchy
- Subtle, purposeful animations
- Light and dark themes
- Respect the user's system theme
- Persist the selected theme locally

Avoid:

- Excessive glassmorphism
- Excessive gradients
- Excessive rounded or pill-shaped UI
- Unnecessary decorative elements
- Generic AI-dashboard aesthetics
- Visual clutter
- Animations that slow down interaction

Do not use browser `alert()` dialogs for normal application interactions.

## Tool architecture

Implement tools as independent modules whenever practical.

Use a central tool registry or catalog so the application can discover:

- tool name
- description
- category
- icon
- route
- status
- search keywords

A new tool should ideally require only:

1. Creating its tool module or page
2. Registering it
3. Adding its user-facing text to both `de.json` and `en.json`
4. Adding tests where appropriate

Do not duplicate the application's global layout, theme logic, or navigation inside individual tools.

Tools must not directly manipulate unrelated parts of the application.

## Routing

Use clean, predictable tool routes such as:

```text
/tools/<tool-name>
```

The routing implementation must remain compatible with GitHub Pages. Do not assume that server-side route rewriting is available.

## Tool quality

Every tool marked as available must actually work.

Do not create fake buttons, fake functionality, or UI that looks functional but is not implemented.

Validate user input. Handle invalid and empty input gracefully. Avoid application crashes caused by malformed input.

Provide useful empty, loading, and error states where relevant.

## Accessibility

Build accessibility into every feature.

Use:

- Semantic HTML
- Properly associated labels
- Keyboard navigation
- Visible focus states
- Accessible buttons
- Appropriate contrast
- Meaningful accessible names
- ARIA only when necessary

Do not use ARIA as a substitute for correct semantic HTML.

## Performance

Keep the application lightweight.

Prefer:

- Lazy loading for larger tools where appropriate
- Browser-native APIs
- Small reusable utilities
- Avoiding unnecessary dependencies
- Avoiding unnecessary rerenders

Do not optimize prematurely, but do not introduce obviously expensive implementations for simple tasks.

## Existing tools

An existing HTML implementation of the **Draußen-Tracker** already exists.

When that tool is eventually integrated:

- Preserve its existing functionality unless explicitly asked to change it.
- Adapt it to the Toolbox architecture.
- Do not blindly rewrite working functionality.
- Keep its behavior consistent during migration.
- Improve it only when explicitly requested, or when a change is required for integration.

The original implementation may be provided separately in a future task.

## Testing

Before considering a task complete:

- Run the project's available tests.
- Run TypeScript checks where available.
- Run the production build.
- Fix errors introduced by the changes.

New functionality should receive appropriate tests when practical.

Do not claim that something works if it has not been tested.

## Documentation

Keep `README.md` accurate when project structure, setup, features, or development instructions change.

Document significant architectural decisions when they are useful for future development.

Keep documentation concise and maintainable.

## Git workflow

For development tasks:

- Inspect the current repository before making changes.
- Preserve existing work.
- Make focused changes.
- Avoid unrelated refactors.
- Use descriptive commit messages.
- Create a clear pull request summary.
- Mention tests performed.
- Mention relevant limitations or follow-up work.

Never overwrite or delete existing work merely to simplify implementation.

## Arena agent behavior

Before implementing a task:

1. Inspect the repository.
2. Inspect relevant existing files.
3. Understand the current architecture.
4. Identify the smallest clean implementation.
5. Implement the requested functionality.
6. Test it.
7. Review the resulting diff.
8. Update documentation if necessary.

If a requirement is ambiguous, choose the simplest interpretation consistent with the existing project architecture.

Do not invent major product requirements.

Do not add unrelated features for completeness.
