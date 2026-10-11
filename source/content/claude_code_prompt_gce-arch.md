# Task: build a self-contained pixel-art publications and projects page

You are working in a Git repository that is already cloned and linked to its GitHub remote. The repository is empty. Read this whole document before you start. All content for the page is in section 12. Use it exactly as written: do not rewrite, paraphrase, shorten, reorder, or "improve" any text in it, and do not look for other sources.

This file (`claude_code_prompt.md`) may be present in the working directory. Do not commit it. If it is inside the repository folder, add it to `.git/info/exclude`.

---

## 1. Deliverables and repository handling

- `index.html` at the repository root: one self-contained file with all HTML, CSS, JavaScript, fonts, and graphics inline.
- `README.md` at the repository root: short, see section 14.
- Nothing else is committed (no screenshots, no `package.json`, no `node_modules`, no build output). Keep all working files in a temporary directory outside the repository, for example under `/tmp`.
- Commit directly to the default branch. Do not create branches or pull requests. If the repository has no commits yet, make the initial commit on `main`.
- Commit message: `Add pixel-art publications and projects page`.
- If `git user.name` or `git user.email` is not set, stop and tell me. Do not invent an identity and do not change global git configuration.
- If the push fails, leave the commit in place and report the error.

## 2. Hard constraints

1. Self-contained: no network request of any kind when the page loads. No CDN, no web-font service, no external images, no external scripts or stylesheets, no `@import`, no analytics. The only external URLs allowed are the `href` targets of links the visitor clicks.
2. The file must work when opened directly from disk (`file://`) and when served from any static host.
3. Plain HTML, CSS, and vanilla JavaScript. No frameworks, no build step.
4. No `localStorage`, `sessionStorage`, or cookies.
5. All graphics are original pixel art drawn in code (section 5). Do not reproduce or imitate specific assets, characters, logos, or icons from any game or franchise. The game references below describe a mood only.
6. Target size: under 1.5 MB for `index.html`.
7. Language and spelling: American English in everything you write (README, code comments, UI labels you add). Published titles and abstracts keep their published spelling.
8. No emojis anywhere.

## 3. Visual language

Mood: a late-1990s fantasy role-playing interface shown on a very large television. Large elements, thick pixel borders, high contrast, generous spacing, readable from a distance, with a console-game feel. Professional and clean, not barebones.

- **Palette:** navy `#12355b` and gold `#b8892b` as the identity colors, on a dark stone background. Parchment for scrolls and for publication modals, blue for the mana potion, red for the health potion, brown leather for the journal. Define colors as CSS custom properties. Use a limited shared palette (about 16 to 24 colors) across all sprites.
- **Pixel unit:** define one global integer pixel unit `--px`, set by JavaScript on load and on resize to `Math.max(2, Math.round(window.innerWidth / 640))` (3 at 1920 px, 6 at 3840 px). Define borders, gaps, padding, and sprite sizes as multiples of `--px` so that edges stay crisp. Provide a CSS fallback of `3px` for the case that JavaScript is disabled.
- **Everything is pixel styled:** fonts, buttons, panels, borders (stepped corners, bevels), the modal frame, the scrollbars (`::-webkit-scrollbar` plus `scrollbar-color` for Firefox), focus rings, and the close button. Backgrounds use a subtle tiled stone pattern drawn as an inline SVG data URI or a CSS gradient pattern, plus a soft dark vignette. Keep the background quiet so text stays readable.
- **Optional, low priority:** a custom pixel cursor (arrow and pointing hand) using inline SVG data URIs with a standard cursor as fallback. Skip it if it reduces usability or looks unclear on any background.
- **Reference viewport:** 1920 × 1080. Minimums at that size, in CSS pixels: card titles 26 or larger, modal body text 22 or larger, citations 22 or larger, header name 36 or larger. Scale up smoothly for larger screens through `--px`.
- **Contrast:** body text against its background at least 4.5:1, large text at least 3:1. Dark brown text on parchment, light text on dark panels.
- **Hover and focus ("glow"):** every clickable element (header lines, tabs, cards, buttons, links) must visibly light up on pointer hover and on keyboard focus. Use a brightness increase plus a hard-edged, stepped glow outline (stacked offset shadows or chained drop-shadows with no blur larger than one pixel unit). Use a short stepped transition (`steps(3)`) that is disabled under `prefers-reduced-motion: reduce`. Potion tab icons glow in the color of their liquid, cards and links glow gold. The glow must also show on keyboard focus (`:focus-visible`).

## 4. Fonts

- Use at most two typefaces, both under the SIL Open Font License, embedded in the file as base64 WOFF2 inside `@font-face` rules. Candidates: Press Start 2P (name, tab labels, section headings: short strings only), and Pixelify Sans or VT323 for everything else (card titles, citations, abstracts). Silkscreen is an acceptable alternative for small labels.
- Choose the body font by rendering the longest abstract (the project abstract for J5-50159) at 1920 × 1080 and comparing candidates. Reading comfort wins over style.
- Get the font files from the npm packages `@fontsource/press-start-2p`, `@fontsource/pixelify-sans`, `@fontsource/vt323`, or `@fontsource/silkscreen`. Do not download from Google Fonts or other sites; the workspace may block them.
- Subset the fonts with `fonttools` (`pip install fonttools brotli`, using `--break-system-packages` if needed) to: Basic Latin, Latin-1 Supplement, Latin Extended-A, General Punctuation (en dash, em dash, curly quotes, ellipsis, bullet), and the characters `»` `«` `·` `×`. Keep every embedded font under about 200 KB.
- The data contains diacritics, so verify glyph coverage. Required glyphs: Č č Š š Ž ž Ć ć Đ đ ö ü é ä è ’ “ ” – — … • ·. Render a test string in each font and confirm that no fallback font is used (use `document.fonts.check` and a screenshot).
- Where a font has a native pixel grid, set sizes in multiples of it (Press Start 2P: multiples of 8 px). Set `text-rendering: optimizeSpeed` and `-webkit-font-smoothing: none` where supported.
- If you cannot obtain the fonts (no network access to npm or pip), stop and tell me. Do not silently fall back to system fonts.
- Record each font's name, license, and copyright line in the README.

## 5. Pixel art assets (you design them)

Draw every sprite in code from small character grids plus a palette map, and render each to inline SVG (`shape-rendering="crispEdges"`, `viewBox` in sprite pixels, merged horizontal runs of equal color to keep the file small). Mark all sprite SVGs `aria-hidden="true"`; the accessible names live on the buttons and links.

Style rules: one-pixel dark outline in a darker hue of the fill, three to four tones per material (base, highlight, shadow, deep shadow), light from the upper left, no anti-aliasing, no gradients inside sprites.

Required sprites:

1. **Mana potion** (tab "Scientific publications"): round-bottom glass flask with a cork, blue liquid, highlight glint, a few bubble pixels. About 24 × 24 or 32 × 32 sprite pixels.
2. **Health potion** (tab "Projects"): same silhouette family as the mana potion, red liquid, so the two read as a pair, but clearly distinct in shape or stopper detail.
3. **Quest journal** (tab "Links"): thick leather book with a ribbon bookmark, metal corner caps, and a clasp, possibly with a quill. Brown family, distinct from the tomes.
4. **Scroll** (publication cards): parchment with rolled top and bottom ends, curled edges, a small red wax seal. The flat middle area must stay clear for text and cover at least 70 percent of the card.
5. **Tome** (project cards): thick closed book seen from the front, leather cover, gold corner brackets, spine bands, a metal clasp, and a gem. The cover has a plain parchment label plate where the title goes, so the text stays legible. Cover colors may cycle through three or four palettes (for example deep green, wine red, indigo, bronze) purely as decoration, in a fixed order, with no implied meaning.
6. **Signpost** (links): a wooden post with plank boards. Each board is an arrow-shaped plank with a pointed end, nail heads, and wood grain in pixels. Boards alternate left and right along the post. Each section also has a heading plaque (hanging sign or a plank at the top of the post).
7. **Small UI sprites:** close button (pixel X), external-link arrow, bullet gem for list items, scrollbar parts.
8. **Favicon:** a tiny pixel potion as an inline SVG data URI.

## 6. Page structure

Semantic markup: `<html lang="en">`, a `<header>`, a tab bar, `<main>`, three `<section>` tab panels. `<title>`: `Gregor Čehovin – Publications and projects`. Add a `<meta name="description">` and a viewport meta tag.

### 6.1 Persistent header

Content (from `DATA.header`):

- Name line as the page `<h1>`: `doc. dr. Gregor Čehovin, Research Fellow` (the first part stays untranslated, by choice).
- Four institution lines below it, each a link that opens in a new tab (`target="_blank"`, `rel="noopener noreferrer"`), each glowing on hover and focus:
  1. University of Ljubljana
  2. Faculty of Social Sciences
  3. Chair of Social Informatics and Methodology
  4. Centre for Social Informatics
- The three tabs sit at the bottom of the header.

Behavior:

- The header stays visible while the page scrolls.
- Expanded state (at the top of the page): name, four lines, tabs.
- Collapsed state (after scrolling): the institution lines hide, and the name (smaller) and the tabs stay in one compact bar. This keeps screen space for the card grids.
- Collapsing must not change the document height, otherwise short pages (for example the Links tab on a small window) can oscillate between the two states. Use either a fixed or sticky header together with a constant-height spacer, or animate with `transform` or `clip-path`. Use two different scroll thresholds (collapse later than expand) as hysteresis.
- No flicker, no layout jump, no scroll-position jump at the switch.
- The modal overlays the header.

### 6.2 Tabs

- Three large tab buttons, each with its sprite icon and a label, in this order: `Scientific publications` (mana potion), `Projects` (health potion), `Links` (quest journal).
- Use `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`, `aria-controls`. Left and right arrow keys, Home, and End move between tabs.
- The active tab has a persistent distinct state that does not rely on color alone (for example a lowered plate, a gold underline bar, and a lit icon).
- The active tab is stored in the URL hash: `#publications`, `#projects`, `#links`. Default: `#publications`. Handle `hashchange` and the initial hash. Switching tabs scrolls to the top.

## 7. Tab "Scientific publications"

Data: `DATA.publications` (11 entries, in the given order).

Grid of scroll cards:

- Responsive columns: 4 at 1600 px and wider, 3 at 1200 px and wider, 2 at 760 px and wider, 1 below that.
- At 1920 × 1080 with the expanded header, at least two full rows must be visible, and with the collapsed header at least three.
- Each card is a `<button>` that shows the scroll sprite and only the `shortTitle`, in a large font, centered in the clear area of the scroll.
- Titles longer than the space are clamped to a fixed number of lines (five or six, whatever the card height allows) with a trailing ellipsis (`line-clamp`). Never shrink the font to fit.
- The accessible name of each card is its `fullTitle`; add `aria-haspopup="dialog"`.

Modal (opens on click):

- The panel looks like an unrolled parchment with pixel-art rolled ends. Optionally unroll with a short stepped animation (disabled under reduced motion).
- Content, top to bottom:
  1. `fullTitle` as the modal heading. If `titleEn` exists, show it below the heading in a smaller, secondary style, in square brackets.
  2. Label `Citation (APA 7)`, then the `citation` (rendered with its italics).
  3. Two buttons side by side: `Copy citation` (copies the plain text of the citation, with tags stripped; the label changes to `Copied` for about two seconds; use `navigator.clipboard` when available and fall back to a hidden textarea with `document.execCommand("copy")`, because `file://` pages may not have clipboard permission) and an `Open article` link (opens `href` in a new tab; the visible link text is the URL itself, wrapped with `overflow-wrap:anywhere`).
  4. The abstract. If `abstractLang` is `"en"`: label `Abstract`, then the text. If `abstractLang` is `"sl"`: label `Abstract (Slovenian, original)`, then the Slovenian text, then label `English translation (machine-generated)`, then `abstractEn`.
- The modal body scrolls internally when the content is long. The header of the modal (title and close button) stays visible.

## 8. Tab "Projects"

Data: `DATA.projects` (17 entries, in the given order, which is the source order; do not sort and do not separate current from past).

Grid: same grid, sizes, clamping, and behavior as the publications tab, but each card is a tome sprite with the project `title` on the label plate. Keep the label plate readable at 26 px or larger.

Modal (opens on click). The panel looks like a book page (leather frame, parchment page):

1. The project `title` as the heading.
2. A fact list. Show only the facts that exist for that entry:
   - `Project leader` (or `Program leader` when `kind` is `"program"`)
   - `Period`
   - `Funder`
   - `Code`
3. If the entry has an `abstract`: label `Abstract`, then the text. If it has none, show no abstract section and no placeholder text.

## 9. Tab "Links"

Data: `DATA.links` (three sections).

- Each section is a signpost: a heading plaque, then one arrow-shaped board per item, alternating left and right along the post.
- Each board is a link (`target="_blank"`, `rel="noopener noreferrer"`) showing `title` (large) and `subtitle` (smaller) on the board. Do not print a `»` character; the arrow-shaped end of the board replaces it. Long titles wrap to two lines on the board.
- Lay the sections out in a responsive grid: three columns at 1600 px and wider, two at 1000 px and wider, one below that. Within a section, the post is a vertical element spanning all of its boards.
- Boards glow on hover and keyboard focus. Add a small external-link arrow sprite on each board.

## 10. Interaction, accessibility, responsiveness

- **Modal behavior:** `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing at the heading. Move focus into the dialog on open, trap Tab inside it, close on Esc, on a click outside the panel, and on the close button (a large, glowing pixel X with the accessible name `Close`). Return focus to the card that opened it. Lock page scrolling while open. Respect `prefers-reduced-motion`.
- **Keyboard:** everything reachable and operable by keyboard, visible focus everywhere.
- **Screen readers:** headings in a sensible order, external links open in a new tab and say so (visually hidden text `(opens in a new tab)`).
- **Responsive:** supports 3840 × 2160 down to 360 px wide. On narrow screens the header stays compact (name plus tabs), tab labels may wrap or shrink, and modals become full-screen sheets.
- No horizontal page scroll at any width.
- **Content safety:** render data text with `textContent`, except fields that allow the inline tags `<i>`, `<b>` (citation, abstracts, titles). For those fields use a small whitelist function that escapes everything except `<i>`, `</i>`, `<b>`, `</b>`. Assign `href` through DOM properties, never through string concatenation.

## 11. Data handling

- All content lives in one JavaScript object named `DATA` at the very top of the main `<script>`, preceded by a comment block `EDIT CONTENT HERE`, so that I can edit text later without touching code. Copy section 12 into the file unchanged, apart from adding the closing semicolon and wrapping it in the script.
- Paragraphs inside `abstract` and `abstractEn` fields are separated by blank lines; split on `/\n\s*\n/` and render each as a `<p>`. A paragraph that starts with `• ` renders as a list item with the bullet gem sprite instead of the character.
- Fields in `projects`: `id`, `kind` (`"project"` or `"program"`), `title`, `leader`, `period`, `funder` (optional), `code` (optional), `abstract` (optional).
- Fields in `publications`: `id`, `shortTitle`, `fullTitle`, `titleEn` (optional), `citation`, `href`, `abstractLang` (`"en"` or `"sl"`), `abstract`, `abstractEn` (only when `abstractLang` is `"sl"`).
- Build every tab from `DATA`. There must be no content duplicated in the HTML.

## 12. Data block

```js
const DATA = {
  header: {
    name: "doc. dr. Gregor Čehovin, Research Fellow",
    lines: [
      { text: "University of Ljubljana", href: "https://www.uni-lj.si/en/" },
      { text: "Faculty of Social Sciences", href: "https://www.fdv.uni-lj.si/en/" },
      { text: "Chair of Social Informatics and Methodology", href: "https://www.fdv.uni-lj.si/en/study/departments-and-chairs/department-of-sociology/chair-of-social-informatics-and-methodology" },
      { text: "Centre for Social Informatics", href: "https://www.fdv.uni-lj.si/en/research/research-centres/department-of-sociology/centre-for-social-informatics" }
    ]
  },

  publications: [
    {
      id: "pub-01",
      shortTitle: "Using web survey paradata to analyze response quality, respondent characteristics, and survey estimates",
      fullTitle: "Using web survey paradata to analyze response quality, respondent characteristics, and survey estimates: A state-of-the-art review and typology",
      citation: "Vehovar, V., & Čehovin, G. (2026). Using web survey paradata to analyze response quality, respondent characteristics, and survey estimates: A state-of-the-art review and typology. <i>Journal of Survey Statistics and Methodology</i>, Article smag003. https://doi.org/10.1093/jssam/smag003",
      href: "https://doi.org/10.1093/jssam/smag003",
      abstractLang: "en",
      abstract: `In the context of web surveys, the term paradata primarily refers to digital traces of the response process. With the increasing prevalence of web surveys, paradata are often perceived as vital for analyzing the methodological and substantive aspects of web surveys. We evaluated these claims through a state-of-the-art literature review. An extensive search process yielded 3,436 screened abstracts and 173 empirical publications that addressed web survey paradata. The results showed that empirical research on such paradata remains relatively limited, characterized by stable publication levels and quite narrow scopes. Specifically, paradata were primarily employed to examine response quality (92 percent of publications), with respondent characteristics (25 percent) and substantive issues (6 percent) being addressed less frequently. In terms of indicators, response times dominated (83 percent), followed by device type (38 percent), while navigation (9 percent), answer changes (8 percent), multitasking (8 percent), and other advanced indicators were used less frequently. In this article, we discuss these results and provide an operational framework that addresses the complexities of integrating paradata into survey design, thereby facilitating the formulation of realistic expectations in survey research practice.`
    },
    {
      id: "pub-02",
      shortTitle: "Probability-based web panels for official statistics",
      fullTitle: "Probability-based web panels for official statistics: Basic insights and analysis of the bias of survey estimates",
      citation: "Čehovin, G., & Vehovar, V. (2026). Probability-based web panels for official statistics: Basic insights and analysis of the bias of survey estimates. <i>Statistika</i>, <i>106</i>(2), 164–179. https://doi.org/10.54694/stat.2025.28",
      href: "https://doi.org/10.54694/stat.2025.28",
      abstractLang: "en",
      abstract: `The past three decades of survey research have revealed a shift from traditional probability-based surveys to various types of web surveys. In official statistics, the probability-based web panels (PWPs), for which respondents are recruited once and then incentivized for repeated participation in web surveys, play a particularly important role in this process. This article provides insights into the use of PWPs for official statistics. First, a survey of European Union national statistics offices revealed that one-quarter had already implemented or were planning to implement PWPs; the main barriers to their implementation were lack of knowledge and expertise. In addition, we evaluated the quality of the estimates in the Slovenian PWP (1KA Panel) that replicated questions from 12 traditional probability-based surveys. The findings showed that 205 of 651 PWP estimates (31%) exhibited relative bias exceeding 10%. Biases varied substantially across survey topics, indicating the selective suitability of PWPs for official statistics.`
    },
    {
      id: "pub-03",
      shortTitle: "Big Five personality dimensions and disintegration as antecedents of vertical and horizontal internet privacy concerns",
      fullTitle: "Big Five personality dimensions and disintegration as antecedents of vertical and horizontal internet privacy concerns",
      citation: "Bartol, J., Bošnjak, M., Vehovar, V., Čehovin, G., & Petrovčič, A. (2025). Big Five personality dimensions and disintegration as antecedents of vertical and horizontal internet privacy concerns. <i>Cyberpsychology: Journal of Psychosocial Research on Cyberspace</i>, <i>19</i>(3), Article 9. https://doi.org/10.5817/CP2025-3-9",
      href: "https://doi.org/10.5817/CP2025-3-9",
      abstractLang: "en",
      abstract: `Given the role that internet privacy concerns (IPCs) have in individuals’ online behaviors, it is essential to understand how personality shapes people’s concerns about privacy online. The five-factor model of human personality—with the Big Five personality dimensions of openness, conscientiousness, extraversion, agreeableness, and neuroticism—has been widely used to study the formation of internet users’ privacy concerns. However, existing literature has investigated only vertical (institutional) IPCs, while there is no corresponding research on horizontal (peer) IPCs. The role of a recently proposed personality trait, disintegration, which captures individuals’ proneness to perceive connections among unrelated phenomena and thus complements existing personality models, has also not been examined yet. This preregistered study addressed these gaps by investigating the associations of the Big Five personality dimensions and the disintegration trait with vertical and horizontal IPCs among internet users. The hypotheses and research questions were addressed through path analysis on a sample of internet users (<i>N</i> = 797) aged 18 years or older, recruited through probability-based sampling (response rate 42%). The results showed that agreeableness was associated with greater vertical IPCs, whereas openness with lower and disintegration with higher horizontal IPCs. The association between disintegration and vertical IPCs was moderated by previous privacy violations. The findings suggest that personality traits have different associations with vertical and horizontal IPCs, warranting further investigation of the role of the disintegration trait in individuals’ online privacy perceptions and behaviors.`
    },
    {
      id: "pub-04",
      shortTitle: "Identifying a set of key paradata indicators in web surveys based on the relationship with response quality, respondent characteristics and survey estimates",
      fullTitle: "Identifying a set of key paradata indicators in web surveys based on the relationship with response quality, respondent characteristics and survey estimates",
      citation: "Vehovar, V., Berzelak, J., & Čehovin, G. (2024). Identifying a set of key paradata indicators in web surveys based on the relationship with response quality, respondent characteristics and survey estimates. <i>Survey Research Methods</i>, <i>18</i>(3), 225–249. https://doi.org/10.18148/srm/2024.v18i3.8304",
      href: "https://doi.org/10.18148/srm/2024.v18i3.8304",
      abstractLang: "en",
      abstract: `Web survey paradata refer to digital traces left by respondents in web surveys that provide valuable insights into the response process. This paper aimed to identify a minimal set of paradata indicators that can be used in a similar manner to sociodemographic variables, i.e. as general characteristics of respondents. The exhaustive literature review revealed that web survey paradata have predominantly been studied in relation to response quality and sometimes also in relation to respondent characteristics and survey estimates. In the empirical part of the paper, a comprehensive set of raw paradata for a typical web survey was collected (<i>n</i> = 3,458). Based on the literature, an initial set of 112 paradata indicators was identified and further reduced through subsequent steps. Finally, the potential paradata indicators were examined for their statistically significant relationship with 9 response quality indicators, 8 respondent characteristics (including Big Five personality dimensions) and 13 survey estimates (related to computers and internet). The result of this process was a set of 12 key paradata indicators that could serve as a starting point for the creation of standardised paradata indicators that could potentially augment web survey response data.`
    },
    {
      id: "pub-05",
      shortTitle: "Item nonresponse in Web versus other survey modes",
      fullTitle: "Item nonresponse in Web versus other survey modes: A systematic review and meta-analysis",
      citation: "Čehovin, G., Bošnjak, M., & Lozar Manfreda, K. (2023). Item nonresponse in Web versus other survey modes: A systematic review and meta-analysis. <i>Social Science Computer Review</i>, <i>41</i>(3), 926–945. https://doi.org/10.1177/08944393211056229",
      href: "https://doi.org/10.1177/08944393211056229",
      abstractLang: "en",
      abstract: `Nonresponse is a fundamental issue in survey research, due to the trend of declining response rates across survey modes. This issue is particularly serious for web surveys: A recent meta-analysis found that unit nonresponse in web surveys is, on average, higher by 12 percentage points than in other modes (Daikeler et al., 2020). Although the issue of unit nonresponse in web and other survey modes has been investigated in several meta-analyses, item nonresponse has not been examined meta-analytically, a gap addressed by this paper. Are web surveys at a disadvantage compared to other survey modes in terms of item nonresponse as well? To address this question, 13 eligible experimental manuscripts reporting 23 effect sizes were identified in a comprehensive literature search. Meta-analytic findings showed that there was no statistically significant difference in the average item nonresponse rate in web versus other survey modes. However, six moderator variables were found to statistically significantly affect the relation between the survey mode and the item nonresponse rate, namely, the target population, the number of contacts, the mode to which the web survey mode was compared, the survey sponsor, the age of the survey, and the baseline item nonresponse rate of the compared mode. The main practical implication is that while web and other survey modes differ in terms of unit nonresponse (on average), item nonresponse rates in web surveys are similar compared to other modes.`
    },
    {
      id: "pub-06",
      shortTitle: "Alternative layouts for grid questions in PC and mobile web surveys",
      fullTitle: "Alternative layouts for grid questions in PC and mobile web surveys: An experimental evaluation using response quality indicators and survey estimates",
      citation: "Vehovar, V., Couper, M. P., & Čehovin, G. (2023). Alternative layouts for grid questions in PC and mobile web surveys: An experimental evaluation using response quality indicators and survey estimates. <i>Social Science Computer Review</i>, <i>41</i>(6), 2122–2144. https://doi.org/10.1177/08944393221132644",
      href: "https://doi.org/10.1177/08944393221132644",
      abstractLang: "en",
      abstract: `The grid question refers to a table layout for a series of survey question items (i.e., sub-questions) with the same introduction and identical response categories. Because of their complexity, concerns have already been raised about grids in web surveys on PCs, and these concerns have heightened regarding mobile devices. Some studies suggest decomposing grids into item-by-item layouts, while others argue that this is unnecessary. To address this challenge, this paper provides a comprehensive evaluation of the grid layout and four item-by-item alternatives, using 10 response quality indicators and 20 survey estimates. Results from the experimental web survey (<i>n</i> = 4644) suggest that item-by-item layouts (unfolding or scrolling) should be used instead of grids, not only on mobile devices but also on PCs. While the former justifies the already increasing use of item-by-item layouts on mobile devices in survey practice, the latter implies that the prevailing routine of using grids on PCs should be reconsidered.`
    },
    {
      id: "pub-07",
      shortTitle: "Izzivi uporabe neverjetnostnih spletnih panelov v družboslovnem raziskovanju",
      fullTitle: "Izzivi uporabe neverjetnostnih spletnih panelov v družboslovnem raziskovanju",
      titleEn: "[Challenges of using nonprobability online panels in social research]",
      citation: "Vehovar, V., & Čehovin, G. (2022). Izzivi uporabe neverjetnostnih spletnih panelov v družboslovnem raziskovanju [Challenges of using nonprobability online panels in social research]. <i>Teorija in praksa</i>, <i>59</i>(4), 849–870. https://doi.org/10.51936/tip.59.4.849-870",
      href: "https://doi.org/10.51936/tip.59.4.849-870",
      abstractLang: "sl",
      abstract: `V sodobnem družboslovnem raziskovanju se anketiranje izvaja predvsem prek spleta. Pri tem se zaradi visokih stroškov rekrutiranja enot v vzorec vse pogosteje uporabljajo spletni paneli. Gre za velike baze potencialnih anketirancev, ki so podali soglasje, da za določeno nagrado sodelujejo v različnih spletnih anketah. Večina tržnih ter določeni delež raziskav javnega sektorja sta že prešla na neverjetnostne spletne panele, ki so bistveno cenejši od anket na osnovi verjetnostnih vzorcev. Te pa na drugi strani zagotavljajo večjo točnost anketnih ocen. Članek pregleda evalvacije neverjetnostnih spletnih panelov, ilustrira tipične težave, ki pri tem nastajajo, ter predstavi smernice za presojo o njihovi uporabi.`,
      abstractEn: `In contemporary social science research, surveys are conducted mainly on the web. Owing to the high costs of recruiting units into the sample, online panels are increasingly used for this purpose. These are large pools of potential respondents who have agreed to participate in various web surveys in exchange for a certain reward. Most market research and a certain share of public sector research have already moved to nonprobability online panels, which are substantially cheaper than surveys based on probability samples. Surveys based on probability samples, in turn, provide greater accuracy of survey estimates. The article reviews evaluations of nonprobability online panels, illustrates the typical problems that arise in this context, and presents guidelines for judging their use.`
    },
    {
      id: "pub-08",
      shortTitle: "(Im)perfect descriptive representation",
      fullTitle: "(Im)perfect descriptive representation: Slovenia in the spotlight",
      citation: "Johannsen, L., Krašovec, A., & Čehovin, G. (2022). (Im)perfect descriptive representation: Slovenia in the spotlight. <i>Politics in Central Europe</i>, <i>18</i>(2), 271–294. https://doi.org/10.2478/pce-2022-0012",
      href: "https://doi.org/10.2478/pce-2022-0012",
      abstractLang: "en",
      abstract: `The failure to ensure descriptive representation is one of the challenges facing democracy. In the literature, it is suggested that, among others, imperfect descriptive representation is connected to insufficient legitimacy as well as low trust in political institutions. This paper analyses the link between descriptive representation and both people’s satisfaction with the way democracy is working in practice and trust in political institutions in Slovenia which, despite 30 years of democratic rule, are characterised by persistent low trust and satisfaction levels. Considering longitudinal public opinion data and a database on the composition of the Slovenian parliament (eight terms) in terms of gender, age groups and education, we find that also in Slovenia especially women, the young, the elderly and those with a basic education are underrepresented, with this being reflected in trust in the parliament and people’s perception of the way in which democracy is working. Still, the fact such underrepresentation has continued for some time (regardless of certain changes) means these findings are only part of the explanation.`
    },
    {
      id: "pub-09",
      shortTitle: "Meta-analyses in survey methodology",
      fullTitle: "Meta-analyses in survey methodology: A systematic review",
      citation: "Čehovin, G., Bošnjak, M., & Lozar Manfreda, K. (2018). Meta-analyses in survey methodology: A systematic review. <i>Public Opinion Quarterly</i>, <i>82</i>(4), 641–660. https://doi.org/10.1093/poq/nfy042",
      href: "https://doi.org/10.1093/poq/nfy042",
      abstractLang: "en",
      abstract: `Meta-analytic techniques have become the standard methods for aggregating the results from thematically related studies in the behavioral, health, and economic sciences. To analyze the state of the art of using meta-analyses in survey methodology, previous meta-analyses are systematically identified and classified according to the thematic areas the analyses address. This is followed by identifying gaps in research (i.e., areas where there are few or no existing meta-analyses) and investigating potential avenues for future meta-analyses in this field. The findings are based on a systematic search of two bibliographic harvesters (together covering 265 bibliographic databases), which yielded 54 eligible manuscripts reporting 60 meta-analytic studies and 91 effect sizes. To identify the thematic areas, the effect sizes are structured according to seven categories of the total survey error (TSE). Characteristics of primary studies that potentially influence the variability of meta-analytic findings also are considered, such as the survey mode, questionnaire design, and sample characteristics. The results show that the thematic areas of these meta-analyses cover only two of the seven TSE categories: measurement and nonresponse error. Thematic areas in the remaining TSE categories are not covered, and the key practical implication is that gaps exist in current research. Regarding the methodology of existing meta-analyses in the survey methodology field, there are fundamental differences in reporting styles in terms of transparency and replicability, calling for a concerted effort to develop meta-analytic reporting standards for survey methodology.`
    },
    {
      id: "pub-10",
      shortTitle: "Slovenia’s parliamentary elite",
      fullTitle: "Slovenia’s parliamentary elite: Representation and accountability since 1992",
      citation: "Fink-Hafner, D., Kustec, S., Čehovin, G., & Železnik, A. (2017). Slovenia’s parliamentary elite: Representation and accountability since 1992. <i>Teorija in praksa</i>, <i>54</i>(Special issue), 60–79. https://www.dlib.si/details/URN:NBN:SI:DOC-OEDKZSI7",
      href: "https://www.dlib.si/details/URN:NBN:SI:DOC-OEDKZSI7",
      abstractLang: "sl",
      abstract: `Pogosto uveljavljanje odgovornosti parlamentarne elite prek (predčasnih) volitev (skupaj z uvedbo spolnih kvot) je v zadnjem času v Sloveniji privedlo do krčenja izkušenega jedra (ponovno izvoljenih) poslancev, hkrati pa tudi do povečevanja deležev (1) visoko izobraženih poslancev in (2) poslank. Trenutni delež poslancev s prejšnjo parlamentarno izkušnjo, ki je tako nizek, kot je bil v fazi utrjevanja demokracije v letu 1996, kaže na to, da volivci imajo moč, da uveljavljajo odgovornost poslancev in izberejo nove predstavnike. Toda upadanje deleža izkušenih poslancev postavlja pod vprašaj pogosto in radikalno menjavo nacionalne parlamentarne elite kot dolgoročne rešitve sodobnih problemov predstavništva.`,
      abstractEn: `Frequently holding the parliamentary elite to account through (early) elections (together with the introduction of gender quotas) has recently led in Slovenia to a shrinking of the experienced core of (re-elected) members of parliament, and at the same time to growing shares of (1) highly educated members of parliament and (2) women members of parliament. The current share of members of parliament with previous parliamentary experience, which is as low as it was in 1996, during the phase of democratic consolidation, indicates that voters have the power to hold members of parliament to account and to choose new representatives. However, the declining share of experienced members of parliament calls into question the frequent and radical replacement of the national parliamentary elite as a long-term solution to contemporary problems of representation.`
    },
    {
      id: "pub-11",
      shortTitle: "Determinants of voter behaviour at presidential elections in a post-socialist context",
      fullTitle: "Determinants of voter behaviour at presidential elections in a post-socialist context: The case of Slovenia",
      citation: "Hafner-Fink, M., Kustec, S., Fink-Hafner, D., & Čehovin, G. (2014). Determinants of voter behaviour at presidential elections in a post-socialist context: The case of Slovenia. <i>Družboslovne razprave</i>, <i>30</i>(75), 7–27. https://www.dlib.si/details/URN:NBN:SI:DOC-K7G6EYZH",
      href: "https://www.dlib.si/details/URN:NBN:SI:DOC-K7G6EYZH",
      abstractLang: "sl",
      abstract: `Članek prispeva k zapolnjevanju primanjkljaja v literaturi o določnicah volilnega obnašanja na predsedniških volitvah v posocialističnem kontekstu ob upoštevanju vzorcev tekmovanja na parlamentarnih in predsedniških volitvah. Študija primera Slovenije zajema dejavnike volilnega obnašanja na predsedniških volitvah (1997, 2002, 2007 in 2012) na podlagi analize podatkov splošne javnomnenjske anketne raziskave Politbarometer z bivariatnimi in multivariatnimi metodami. Ključne ugotovitve so, da se dejavniki volilnega obnašanja spreminjajo skozi čas in da strankarska identifikacija v zadnjem času izgublja pomen pri volilnem obnašanju na predsedniških volitvah.`,
      abstractEn: `The article helps to fill a gap in the literature on the determinants of voting behavior in presidential elections in a post-socialist context, taking into account the patterns of competition in parliamentary and presidential elections. The Slovenian case study covers the factors of voting behavior in the presidential elections of 1997, 2002, 2007, and 2012, based on an analysis of data from the general public opinion survey Politbarometer using bivariate and multivariate methods. The key findings are that the determinants of voting behavior change over time and that party identification has recently been losing importance in voting behavior in presidential elections.`
    }
  ],

  projects: [
    {
      id: "proj-01",
      kind: "project",
      title: "Assessing and modelling unit nonresponse bias in probability-based web surveys",
      leader: "Gregor Čehovin",
      period: "10/01/2023 – 09/30/2026",
      funder: "Slovenian Research and Innovation Agency (ARIS)",
      code: "J5-50159",
      abstract: `BACKGROUND. Web surveys have become the predominant survey mode, especially when combined with nonprobability sampling. However, this proposal addresses academic, government and other social science research that relies on probability surveys using traditional survey modes (mail, telephone, face-to-face), which are now transitioning to probability-based web surveys (PBWS). In the context of total survey error, web surveys are already known for their strong measurement properties, while noncoverage is a diminishing issue, but nonresponse remains a major problem for PBWS. Recruitment into PBWS relies on traditional survey modes, as there are no email lists for general population surveys, which are the primary domain of this proposal. However, to save costs, recruitment into PBWS is mostly carried out by mail (or email where possible), which significantly reduces response rates, which are often even below 20%. This is very low compared to traditional surveys, where response rates of 70% or 80% were once the standards that have been gradually abandoned (with little justification). Such low response rates increase the danger of nonresponse bias, which means that the estimates from PBWS can differ notably from the true values of the parameters. This presents a serious threat to the quality of empirical social science research.

RESEARCH GAP. Previous evaluations of PBWS have focused on sample representativeness in terms of control variables (e.g., R-indicator) or measurement equivalence. No systematic question-level evaluations have examined PBWS-specific nonresponse biases that may occur for some topics (e.g., poverty) but not for others (e.g., elections). We lack a thorough insight into the moderators associated with this bias.

OBJECTIVES: The main objective is to comprehensively elaborate and model the PBWS-specific nonresponse bias. The overarching research question is: Under what circumstances can PBWS be used instead of traditional surveys, given the impact of nonresponse bias? The sub-objectives are: (1) Analyse and model the moderators of PBWS-specific nonresponse bias, particularly response rate but also research topic, respondent characteristics and methodological features; (2) Predict PBWS-specific nonresponse bias for any question; (3) Evaluate PBWS-specific nonresponse bias in the contexts of accuracy and cost.

METHOD. Objective (1) relies on a systematic literature review and secondary data analysis. PBWS-specific nonresponse bias will be investigated at the question level for selected academic and official surveys in Slovenia and for the CRONOS European Social Survey (ESS). A separate experimental survey will be conducted in parallel with ESS 2025. Objective (2) will draw on the results of the first objective to develop a predictive model using advanced statistical and knowledge discovery methods. In addition, the model will be integrated as a prototype module in an open-source web survey tool. Objective (3) will simultaneously observe the costs and accuracy (which is a measure that integrates bias and variance).

IMPACT. The results will provide: A comprehensive elaboration of nonresponse bias in PBWS; Decision-making guidance on the suitability of PBWS for different objectives in social science research; A feasibility study for a stand-alone tool to predict bias in PBWS, complementing the Survey Quality Predictor (SQP), which predicts measurement error; Contributions to the transition of ESS 2025 to PBWS; Facilitation of the implementation of PBWS in Slovenian official and academic surveys.

TEAM. The principal investigator has demonstrated excellence by publishing in high-impact journals. The research team has pioneered web survey research, authored highly cited articles, written a seminal textbook on web survey methodology and developed an open-source web survey tool (1KA). The advisory board consists of leading international scholars in the field. This promises the successful achievement of the project’s ambitious objectives.`
    },
    {
      id: "proj-02",
      kind: "project",
      title: "Digital transformation of health and social care: Welfare technology acceptance and knowledge among current and future healthcare and social care professionals",
      leader: "Simona Hvalič Touzery",
      period: "10/01/2022 – 09/30/2026",
      funder: "Slovenian Research and Innovation Agency (ARIS)",
      code: "J5-4578",
      abstract: `Health and social care are witnessing a profound technological transformation in which welfare technologies (WT) are becoming a necessity for health and social care professionals (HSCPs). The way HSCPs perceive and accept WT depends on their exposure to education and training. However, studies indicate that education programmes do not necessarily ensure that graduates are equipped with the knowledge and skills needed to use WT in their work. In the future, the lack of knowledgeable HSCPs will be particularly accentuated in Slovenia, where a long-awaited Long-Term Care (LTC) Law – which includes WT – will finally be put into practice. There is some evidence showing that recommendation of HSCPs often results in patients' and care recipients' decision to become WT users. As they are important motivators, HSCPs can contribute significantly to whether a new technology-supported service succeeds or fails. Yet, there is a lack of research that would empirically test WT acceptability among them. The overarching aim of the project is to address these complex issues related to the acceptability of WT (i.e., telecare, telehealth and socially assistive robotics) among current and future HSCPs from sociological point of view. To this end, building on existing technology-acceptance models the project will use a mixed-methods approach and triangulation to accomplish the following:

• Develop a socio-technical theoretical framework of WT acceptability that will be empirically tested.

• Explore the knowledge gap in formal university education among HSCPs and students about WT and knowledge needs regarding WT.

• Review existing measurement instruments and develop an instrument with which to measure attitudinal, technological and contextual factors that affect the acceptability of WT among current (registered nurses, social workers and social gerontologists) and future (students of nursing, social work and social gerontology) HSCPs and apply it in the first national survey.

• Examine relationships among measured factors using qualitative and quantitative data.

• Empirically validate the conceptual model of WT acceptability and prepare guidelines for (1) the deployment of WT in LTC and (2) implementing WT content in university curricula.

This project addresses topics that are highly relevant to general social sciences and emerging national and global societal challenges under the UN SDG3 goal - Health and Wellbeing. We particularly address LTC, an area in which Slovenia faces many challenges that have gone unresolved for decades. The project represents an important breakthrough in the field of WT acceptability, focusing on current and future HSCPs. The project will (1) fill critical conceptual and data gaps, (2) encourage Slovenian policymakers and those who will implement the LTC Law to initiate evidence-based practice and (3) motivate Higher Education Institutions educating HSCPs to address the knowledge gaps on WT. Furthermore, by incorporating emerging technology (social robotics), this project goes beyond the WT currently in use. The project team has extensive experience with large-scale research projects in LTC, informal care, healthcare, telecare and telehealth interventions and quantitative and qualitative methods. The project partner Angela Boškin Faculty of Health Care, Slovenia is also known for its research and development achievements that contribute significantly to the development and positioning of nursing. The quality and feasibility of the project will also be ensured by the long-standing collaboration with key stakeholders in the field of LTC in Slovenia and the close involvement of renowned experts, such as Scientific Advisory Board members from the University of Jyväskylä, INRCA, Vilans, TU Wien, Robert Gordon University. The project is supported also by the CEO of NET4Age-Friendly, a network of researchers from 44 countries, who sees the project as a great asset to this network.`
    },
    {
      id: "proj-03",
      kind: "program",
      title: "Internet research",
      leader: "Vasja Vehovar",
      period: "01/01/2015 – 12/31/2027",
      funder: "Slovenian Research and Innovation Agency (ARIS)",
      code: "P5-0399"
    },
    {
      id: "proj-04",
      kind: "project",
      title: "Slovenian experience from international operations and missions",
      leader: "Ljubica Jelušič",
      period: "09/2024 – 12/2024",
      funder: "Ministry of Defence"
    },
    {
      id: "proj-05",
      kind: "project",
      title: "Analysis of research infrastructures to strengthen national and EU research capacities",
      leader: "Gregor Čehovin",
      period: "10/01/2022 – 12/31/2024",
      funder: "Slovenian Research and Innovation Agency (ARIS)",
      code: "V5-2283",
      abstract: `The proposed project focuses on topics related to European research infrastructures. The research and analysis included in the project will serve as support to the National Research Infrastructure Development Plan (NRRI). Additionally, it also includes a set of topics that will contribute to the realisation of the ERA (European Research Area), in line with the objectives set out in the European Commission's Communication on a renewed Research Area. (European Commission, COM 628/20). Research infrastructures (RIs) are key to strengthening the ERA. Including the European Open Science Cloud (EOSC) and Technology Infrastructures (TIs), RIs are a key support to research and technological innovation and a driving force for multidisciplinary and data-intensive science. The project has two key objectives, which will be achieved through three work packages (WPs):

• A review of the impact of research infrastructures on research capacities in the national and international (EU) space and the preparation of proposals for actions to implement the ESFRI Roadmap at national level.

• The development of an appropriate methodology to be used in the evaluation of the development of European research infrastructures, to support both the ESFRI governance structure and the national countries in the evaluation and formulation of their own RI roadmaps.

<b>WP2: Impact of research infrastructures (RIs) on the development of ERA and the national research and innovation environment</b>

The objectives of the tasks carried out under WP2 are to contribute to the development of the ERA and the national research innovation environment. The accessibility and integrity of the system of research infrastructures in Europe is crucial to support research work within the ERA. In WP2, a meta-study will analyse the key conceptual, operational and research aspects of the drivers and governance arrangements of RIs and TIs. In parallel, we will examine the impact of RI on the development of the Slovenian national research innovation environment. WP2 will also review the systems for monitoring and evaluating the impact of RI, and develop a methodology for monitoring and reporting on the socio-economic impact of RI.

<b>WP3: Case studies on "Collaboration with industry on the example of HPC Vega and selected ERICs"</b>

The aim of the in-depth analysis of the functioning of the selected ERICs and HPC Vega is to identify to what extent the existing research infrastructures already address the needs of industry, what is the experience with RI-industry collaboration and where are the potential barriers to such collaboration.

<b>WP4: Study of funding instruments for research infrastructures in EU Member States</b>

The objective of the tasks in this work package is to examine funding systems and synergies in the use of funds through a study involving data collection by means of questionnaires and interviews among selected RIs. Here, Delphi method will be applied, which is used for forecasting, gathering information in the decision-making process or collecting opinions on different strategies.

Based on the WP2 tasks, we will develop a methodology and indicators for monitoring the performance of RIs that could be applied in all (their) domains of action. We will develop recommendations for monitoring and governance RIs in the EU. An important task will be to apply the findings and recommendations to the Slovenian scientific research environment. Based on the tasks carried out in WP3, we will prepare a proposal for a long-term strategy for the operation of ERIC and other ESFRI Landmark projects, in order to proactively respond to the formation of technological infrastructures where cooperation with industry is already successfully developing. Building on the work carried out in WP4, we will prepare a review of the stable funding of RIs and, on the basis of the findings of the study carried out, make proposals and recommendations for stable funding.`
    },
    {
      id: "proj-06",
      kind: "project",
      title: "Evaluating probability and nonprobability online panels",
      leader: "Vasja Vehovar",
      period: "10/01/2021 – 09/30/2025",
      funder: "Slovenian Research and Innovation Agency (ARIS)",
      code: "J5-3100"
    },
    {
      id: "proj-07",
      kind: "project",
      title: "Outside the ballot box: Youth perceptions and practices of political participation",
      leader: "Marinko Banjac",
      period: "10/01/2021 – 09/30/2025",
      funder: "Slovenian Research and Innovation Agency (ARIS)",
      code: "J5-3109",
      abstract: `Youth political participation is one of the key challenges of contemporary democracies and one of the most studied phenomena within political science and, more broadly, social sciences. The reasons for such interest are related to normative assumptions that citizens’ participation, especially young, is crucial for democracy. Another reason is also in recognizing persistently low levels of youth involvement in formal political participation, which is commonly regarded as one of the fundamental indicators of the crisis of representative democracy.

As contemporary studies convincingly argue, young people, despite their lack of interest in formal channels of political participation, are attracted to alternative ways of participating in political life. However, most research on youth political participation uses narrow definitions and pre-defined channels of political participation, leaving out essential questions, namely how young people perceive themselves and what meanings they attach to politics and political participation.

In response to this identified problem of research, the project builds on the contemporary orientations of “researching with youth”, which places young people at the centre of research, gives them a voice, and treats them as active participants providing key contributions to the research. In the project application, we designed a “beyond the ballot box” approach, which will start from the position of young people and: 1) derive from a broad definition of politics and political participation, 2) recognize and include the youth heterogeneity, 3) address apolitical youth, 4) compare political representations and portrayals of youth political participation in formal (youth) policies with the youth perceptions of political participation beyond voting, and 5) use multidisciplinary approach and mixed methodology.

In accordance with the above starting points, the Beyond the Ballot Box: Perceptions and Practices of Political Participation of Young People project will be implemented in a methodologically innovative way, through an integration of qualitative and quantitative methods.`
    },
    {
      id: "proj-08",
      kind: "project",
      title: "Probability web panels in national statistics for persons and households",
      leader: "Vasja Vehovar",
      period: "09/01/2021 – 08/31/2024",
      funder: "Slovenian Research and Innovation Agency (ARIS)",
      code: "V5-2157",
      abstract: `Due to developments in information and communication technologies and the growing problems associated with traditional survey modes (i.e., increasing costs and decreasing cooperation), survey research is shifting to web-based surveys or mixed-mode surveys. In this context, web panels, where panel members agree in advance to regularly participate (e.g., monthly) in various web surveys for an incentive, present a very specific challenge. In the realm of business and opinion surveys of the general population, the web panels already dominate, especially the nonprobability web panel (i.e., access panels), where the probabilities of the units included in the panel are not known in advance. However, official statistics standards require probability surveys, in which the probabilities of the units potentially included in the panel are positive and known in advance for the entire population. Probability web panels have spread rapidly in recent years in academic research and in some areas of the public sector, but they have not yet gained acceptance in official statistics. Nevertheless, recent challenges in survey research caused by the COVID-19 pandemic, particularly the difficulties in conducting face-to-face interviews, have accelerated the process of considering the suitability of probability web panels also in official statistics. On the one hand, probability web panels reduce costs while retaining the principles of probability sampling; on the other hand, they omit the population that does not use the internet and provide lower response rates, at least when compared to face-to-face surveys (which, however, are not feasible in COVID-19 circumstances). In general, the literature reports that probability web panels are as successful as traditional probability surveys in terms of the quality of survey estimates and, notably, that they are more successful than nonprobability web panels. Against this background, the Statistical Office of the Republic of Slovenia is also confronted with the challenges of probability web panels, although—similar to other statistical offices—it does not yet use these panels in its general population surveys. The project will therefore test the potential of probability web panels comprised of the general population (i.e., persons and households) for the needs of official statistics. The objectives are as follows: 1. provide a comprehensive and up-to-date overview of the global state-of-the-art on the topic in the literature and of the related activities in the leading statistical offices; 2. review the content of potential survey questions suitable for inclusion in such a panel in official statistics, and also consider potential synergies with other public sector stakeholders with relevant survey content and similar interests; 3. conduct a pilot probability web panel to gain insight into survey costs and the quality of statistical estimates and to develop an integrated comparative approach for assessing the quality and costs; 4. conduct a comprehensive feasibility study for the establishment of a probability web panel for official statistics in Slovenia that discusses all related financial, methodological, legal and organizational aspects. The results will provide the stakeholders with new and up-to-date knowledge, including about the corresponding dilemmas. This information will also be the basis for competent decisions. The proposed research group is globally recognized in the field of web surveys. It has conducted pioneering research, published with major publishers and authored highly cited articles and a central monograph in this field. The group has excellent links to leading international researchers and has developed an open-source tool to support the web survey process (1KA). Nationally, the group has established annual professional events on web surveys. This proven track record ensures that the ambitious goals of the proposed project will be fully achieved.`
    },
    {
      id: "proj-09",
      kind: "project",
      title: "Using paradata to evaluate response quality in surveys",
      leader: "Vasja Vehovar",
      period: "07/01/2018 – 06/30/2021",
      funder: "Slovenian Research and Innovation Agency (ARIS)",
      code: "J5-9334",
      abstract: `Technological developments are driving surveys towards paper-free and interview-free data collection methods. Computerised self-administered surveys (among which web surveys dominate) can be conducted much more cheaply, although there are rising concerns about the data quality. Within this context, survey paradata – data about the process of collecting survey data – are playing an increasingly important role. One essential type of paradata is the time a respondent needs to answer a survey question. Together with other paradata (e.g. mouse movements, keystrokes etc.), this can help identify respondents who perform the response process in an undesirable way (e.g. too fast or providing inaccurate answers). Paradata can also serve in evaluations of survey instruments and for online interventions, such as real-time alerts. To effectively capture and process paradata, a proper approach is needed concerning the level of measurement (item, question, page or questionnaire), the metrics used (statistical or cognitive measures), and criteria for the removal of respondents with low quality of responses (e.g. the quickest 1% of respondents). A preliminary literature review and research practice (e.g. online panels) show the current approaches are extremely diverse and inconsistent. Particularly critical is the lack of comprehensive insight into the relationship between paradata, response quality indicators and the effects on estimates when respondents with a high probability of low quality of response are removed. The proposed project addresses issues that are highly relevant to general social science methodology and narrows existing knowledge gaps by pursuing the following objectives: 1. providing new knowledge via a systematic overview of the literature and global research practice on the use of paradata; 2. establishing original knowledge on the link between paradata, response quality and the effects of removing low quality responses; 3. developing new approaches to identify respondents who – according to paradata and response data – demonstrate probability for low quality of response, whereby their removal would increase the overall data quality; 4. developing a set of standardised paradata-based compound indicators – related to quality of responses and also to the social and psychological traits of respondents – to enrich response data. The above objectives will be achieved by studying dedicated web surveys where detailed paradata were captured and specific methodological questions were used, which includes the European Social Survey online panel (CRONOS 2017). In addition, new studies will be conducted with a leading Slovenian online panel (e.g. Valicon), with a global online panel (e.g. Survey Monkey) and with non-panel respondents. Another research stream will comprise a meta-study of around 100,000 web surveys from the 1KA open-survey platform. The project is to be run by a team, which is one of the pioneers of web survey research (since 1996). Besides publications (particularly the monograph Callegaro, Lozar-Manfreda and Vehovar: Web survey methodology, 2015, Sage), the team is internationally recognised for maintaining a central resource for web survey methodology (WebSM.org) and for the open-source survey platform 1KA. The project’s objectives aim to bring some conclusive insights into paradata issues (objectives 1 and 2), areas where considerable controversies exist. The objectives also seek to develop basis for key industry standards (objectives 3 and 4) and for general breakthrough improvements in survey data quality. Assurance that these ambitious goals will be achieved comes from the past achievements and extremely high competence of the Scientific Advisory Board composed of leading researchers in this area: Mick Couper (U of Michigan), Michael Bošnjak (U of Trier), Frauke Kreuter (U of Maryland) and Jon Krosnick (Stanford University).`
    },
    {
      id: "proj-10",
      kind: "project",
      title: "Digital transformation of quantitative data collection in social science research: Integrating survey data collection with big data and paradata for identifying social behaviour",
      leader: "Vasja Vehovar",
      period: "10/01/2018 – 09/30/2020",
      funder: "Slovenian Research and Innovation Agency (ARIS)",
      code: "NI-0004",
      abstract: `The proposed research aims to provide theoretical and practical underpinnings for the augmentation and triangulation of digital trace data with web survey data and with corresponding paradata. The research will focus on identifying, collecting, fusing, analysing and visualising these different data types to produce rich datasets. Within this context, topics highly relevant for general social science research methodology will be explored. This includes developing new methodological approaches to data collection in the social sciences, as well as practical contributions to increase understanding of online user behaviour (e.g. skills, literacy, use and impacts, digital divide, privacy concerns, hate speech). The broader context of policy research will be addressed as well, particularly the information needs, perception and understanding of policymakers.

More specifically, the proposed research will introduce several conceptual, methodological and practical contributions for combining surveys and Big Data: (1) laying the methodological foundations for augmenting and triangulating different digital data sources; (2) creating standardised sets of composite indices of digital trace data; (3) establishing specific sets of survey questions to complement the Big Data; (4) proposing a set of paradata composite indices as a professional standard for augmenting survey responses with paradata; (5) designing practical guidelines on using the new types of datasets for policy decision-makers; (6) expanding visualisation techniques for evaluating online user behaviour based on rich datasets; and (7) compiling suggestions to address ethical and legal challenges arising from rich datasets.`
    },
    {
      id: "proj-11",
      kind: "project",
      title: "Integration of mobile devices into survey research in social sciences: Development of a comprehensive methodological approach",
      leader: "Vasja Vehovar",
      period: "05/01/2017 – 04/30/2020",
      funder: "Slovenian Research and Innovation Agency (ARIS)",
      code: "J5-8233",
      abstract: `This project will address the integration of mobile devices into survey research, which is one of the most promising recent developments in survey methodology. Mobile web surveys, which are designed for completion on smartphones and tablet computers, offer improvements in survey data collection in terms of access to research participants and enhancing survey answers using specific features of mobile devices (e.g. taking photographs, recording audio and scanning barcodes). They also allow data integration from sensors built into mobile devices to provide further insights into an individual’s location, movement, activity, environment and more. However, the exploitation of these potentials in the social sciences remains scattered and limited. The project will combine a range of methods to conduct research in the following areas:

Evaluation of representation issues of mobile web surveys. We will analyse the characteristics of mobile device users to understand which population groups are suitable for administration of mobile web surveys. We will then evaluate the willingness to participate in mobile web surveys and the effectiveness of various measures used to improve participation, particularly when collecting various types of sensor data from mobile devices.

Elaboration of mobile web questionnaire design principles. We will systematically evaluate problems with questionnaire presentation on mobile devices, where appropriate adjustments are needed to ensure response quality and comparability with web questionnaires for personal computers. Specifically, we will address the methodological performance of enhancing survey answers with photographs and other specific features of mobile devices.

Assessment of integrating sensor data to enhance survey data and improve data quality. We will study the methodological performance of sensor data from mobile devices regarding the user’s location, environment (noise and light) and activity (movement). We will also focus on the potential of sensor data for tailoring survey procedures and understanding the influence of a survey context on data quality. This will also serve as a proof-of-concept for integrating sensor and survey data for other applications in substantive social science research.

The systematic methodological elaboration of mobile web surveys achieved by these project objectives will present a pioneering contribution to the field. It will allow the establishment of comprehensive methodological guidelines and recommendations for the implementation of mobile web surveys in the social sciences. All developed technical solutions will be freely available in the open-source survey application 1KA. The project results are expected to have a profound impact on survey methodology and social science disciplines that benefit from surveying studied participants in various target environments and enrich survey data with location and other sensor data (e.g. sociology of health, spatial sociology, communication and leisure studies). The outcomes will also be relevant for the development of mobile data collection methodologies in commercial research and official statistics. The team from the Faculty of Social Sciences is among the pioneers of web survey methodology and is internationally recognized for its scientific publications, international projects, the central resource of information on web surveys (WebSM.org), and development of the open source survey software 1KA. The project group also includes partners from the Artificial Intelligence Laboratory at the Jožef Stefan Institute, who are among the leading researchers in machine learning and data mining, and the Department of Geography at the Faculty of Arts, who work on location data collection and analysis. We will jointly elaborate the project’s activities and exchange findings with other renowned experts from the University of Michigan, Stanford University, Utrecht University and the leading Slovenian market research company Valicon.`
    },
    {
      id: "proj-12",
      kind: "project",
      title: "Evidence-based survey methodology: Contemporary topics",
      leader: "Valentina Hlebec",
      period: "01/01/2018 – 12/31/2019",
      funder: "Slovenian Research and Innovation Agency (ARIS) and German Academic Exchange Service (DAAD)",
      code: "BI-DE/18-19-009 (ARIS); 57402391 (DAAD)"
    },
    {
      id: "proj-13",
      kind: "project",
      title: "Better data to assess the impact of ICT, R&D and innovation on the economy",
      leader: "Jernej Berzelak",
      period: "11/2016 – 09/2017",
      funder: "European Commission, Eurostat",
      code: "2016/S 089-155808"
    },
    {
      id: "proj-14",
      kind: "project",
      title: "Automation of survey questionnaire development and evaluation",
      leader: "Vasja Vehovar",
      period: "07/01/2014 – 06/30/2017",
      funder: "Slovenian Research and Innovation Agency (ARIS)",
      code: "J5-6817"
    },
    {
      id: "proj-15",
      kind: "project",
      title: "Methodology of social research within the context of e-social science",
      leader: "Vasja Vehovar",
      period: "08/01/2013 – 07/31/2016",
      funder: "Slovenian Research and Innovation Agency (ARIS)",
      code: "J5-5538"
    },
    {
      id: "proj-16",
      kind: "program",
      title: "Social science methodology, statistics and informatics",
      leader: "Anuška Ferligoj",
      period: "01/01/2009 – 12/31/2014",
      funder: "Slovenian Research and Innovation Agency (ARIS)",
      code: "P5-0168"
    },
    {
      id: "proj-17",
      kind: "project",
      title: "Information and communication technologies and the transformation of survey research in the social sciences",
      leader: "Vasja Vehovar",
      period: "07/01/2011 – 06/30/2014",
      funder: "Slovenian Research and Innovation Agency (ARIS)",
      code: "J5-4177"
    }
  ],

  links: [
    {
      heading: "Scientific research profiles",
      items: [
        { title: "Bibliography and research profile (SICRIS)", subtitle: "Full bibliography in SICRIS", href: "https://bib.cobiss.net/biblioweb/direct/si/eng/cris/34789" },
        { title: "ORCID", subtitle: "https://orcid.org/0000-0002-9431-3694", href: "https://orcid.org/0000-0002-9431-3694" },
        { title: "Google Scholar", subtitle: "Publications and citations", href: "https://scholar.google.com/citations?user=Y5Ujaf8AAAAJ&hl=en" }
      ]
    },
    {
      heading: "Social networks",
      items: [
        { title: "LinkedIn profile", subtitle: "Scientific profile", href: "https://si.linkedin.com/in/gregorcehovin/" }
      ]
    },
    {
      heading: "University of Ljubljana",
      items: [
        { title: "Faculty of Social Sciences", subtitle: "Faculty · assistant professor", href: "https://www.fdv.uni-lj.si/en/" },
        { title: "Chair of Social Informatics and Methodology", subtitle: "Chair · member", href: "https://www.fdv.uni-lj.si/en/study/departments-and-chairs/department-of-sociology/chair-of-social-informatics-and-methodology" },
        { title: "Centre for Social Informatics", subtitle: "Research centre · research fellow", href: "https://www.fdv.uni-lj.si/en/research/research-centres/department-of-sociology/centre-for-social-informatics" },
        { title: "1KA Panel", subtitle: "Online probability panel · research fellow", href: "https://panel.1ka.si/en/" },
        { title: "1KA – OneClickSurvey", subtitle: "Web survey software · associate", href: "https://www.oneclicksurvey.com/d/" }
      ]
    }
  ]
};
```

---

## 13. Verification (do this before committing)

Work from a temporary directory outside the repository for screenshots and test scripts.

1. **Browser:** use Playwright with Chromium if it is installed or installable. Otherwise use any headless Chrome or Chromium on the machine. If no browser is available, say so in your final report, run the non-visual checks in items 3, 6, and 7 anyway, and state clearly that the visual checks were not done.
2. **Screenshots** at 1920 × 1080 of: each tab with the expanded header; each tab after scrolling (collapsed header); the modal for publications 01 (short abstract), 03 (long title), 07 (Slovenian original plus translation); the modal for projects 01 (long abstract with paragraph labels), 02 (list items), 05 (bold work-package headings), 03 (no abstract, facts only). Look at every screenshot and fix what is wrong: overlapping text, unreadable contrast, clipped sprites, blurry edges, missing glyphs, ellipsis not showing on long titles.
3. **No external requests:** load the file with network logging; the request log must contain nothing except the file itself. Also search the source for `<link`, `<script src`, `@import`, `url(http`, and `src="http`; there must be none.
4. **Layout:** at 1920 × 1080 the publications grid has 4 columns and at least two full rows visible with the expanded header; check 1280 × 720, 768 × 1024, and 390 × 844 as well, with no horizontal scroll at any width.
5. **Header:** scroll up and down on each tab at 1920 × 1080 and at 1280 × 600 (short window) and confirm that the header collapses and expands without flicker, without oscillation, and without a jump in scroll position, including on the Links tab.
6. **Interaction:** with keyboard only: Tab through the header lines, tabs, cards, open and close a modal with Enter and Esc, confirm focus is trapped in the modal and restored afterward, confirm arrow keys move between tabs. Confirm hover and focus glow on every kind of clickable element. Confirm `prefers-reduced-motion: reduce` removes animations.
7. **Data integrity:** the page shows 11 publication cards, 17 project cards, 3 signposts with 3, 1, and 5 boards. Every `href` from section 12 is present. Projects without an abstract show no abstract section. The three Slovenian publications show both labels and both texts. The characters Č š ž ć ö ü é ’ “ ” – … • render in the pixel fonts without fallback glyphs.
8. **Size and cleanliness:** `index.html` under 1.5 MB, valid HTML (no unclosed tags), JavaScript with no console errors or warnings on load and during all interactions.

## 14. README.md

Short, neutral, American English, no emojis. Contents: what the page is; how to open it (double-click `index.html`, or serve the folder with any static host); how to edit content (the `DATA` object at the top of the script, with the list of fields from section 11 and how paragraphs and `• ` list items work in abstracts); how to add an abstract to a project; the fonts used with name, license, and copyright line; one sentence that all pixel art is original and drawn in code.

## 15. Final report

When finished, reply briefly with: the commit hash and branch; the file size of `index.html`; the fonts used; the verification checks you ran and their results (state plainly any check you could not run); any deviation from this document and why. Do not paste code. Do not describe the steps you took.
