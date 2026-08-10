## Start with the reading surface

Pingala lessons are designed to feel calm, generous, and easy to scan. This is a normal paragraph with **strong emphasis**, *quiet emphasis*, `inline code`, a [source link](https://www.markdownguide.org/basic-syntax/), ==a warm highlight==, and ~~a crossed-out thought~~.

You can also place an image directly inside a paragraph: ![A small blue Pingala diagram](/content-assets/assets/formatting-lab.svg). Images use descriptive alt text and never execute HTML.

:::note A note about notes
Select any passage in this lesson. The reader toolbar lets you highlight, circle, cross out, or turn that passage into a handwritten note. Guests can preview the mark; logging in saves it across devices.
:::

### A useful list

- Use a short heading to give the reader a landmark.
- Use a list when the order is not the main idea.
- Add a link whenever a contributor makes a claim that deserves a source.

:::key_takeaways
- Markdown lives in the public curriculum repository.
- The dashboard builds only from the reviewed commit in `content-lock.json`.
- A stable topic ID keeps progress attached when prose improves.
:::

## Callouts make intent visible

:::tip A practical tip
Use a tip for a small shortcut, intuition, or suggestion that helps the reader move forward.
:::

:::warning Keep untrusted content inert
Raw HTML, scripts, JavaScript URLs, and unknown embed hosts are rejected before a pull request can merge.
:::

:::deep-dive Why this is low-cost
GitHub stores versioned lesson text and assets. Cloudflare Pages serves the generated static bundle, while D1 stores only account data and personal learning state.
:::

## Code and mathematics

Inline mathematics such as $a^2 + b^2 = c^2$ stays in the flow of a sentence. A display equation gets its own visual rhythm:

:::math The area under a simple curve
\int_0^1 x^2\,dx = \frac{1}{3}
:::

:::code python
def highlight(value: str) -> str:
    # Comments can be included or omitted from copied code in settings.
    return f"=={value}=="
:::

Turn on line numbers, switch code themes, and copy the example from the code block. The language label is required so examples remain readable and reviewable.

## Images, charts, previews, and attachments

:::image A repository-hosted image
src: ./assets/formatting-lab.svg
alt: A blue diagram showing the Pingala content pipeline
caption: Assets can live beside the Markdown in the public subject repository and are copied into the static bundle.
width: 92%
:::

:::chart A lightweight chart preview
src: ./assets/formatting-lab.svg
alt: A simple chart-style illustration of reviewed content becoming a lesson
caption: Charts use the same safe image pipeline; interactive charts can use an approved embed host.
:::

:::embed A video preview
url: https://www.youtube.com/embed/dQw4w9WgXcQ
height: 360
caption: Embeds are restricted to an allowlist and rendered in a sandboxed frame.
:::

:::attachment Download the content example
url: ./assets/formatting-lab.svg
label: Open the example asset
description: A small SVG attachment demonstrating the preview/download card.
:::

> A good lesson gives the reader enough structure to understand the idea and enough room to make it their own.

:::quote Pingala's writing principle
Clarity is a feature. A contributor's explanation should remain understandable even when the reader skips a diagram or code sample.
:::

## Make it yours

Try selecting the phrase **Clarity is a feature** above. Make a yellow highlight, then create a handwritten note explaining why it matters. Your annotation card uses the Kalam typeface, while the Reading Mode settings let authenticated readers choose a body font, text size, and reading width.

When you contribute a lesson, include learning objectives, authoritative sources, license and provenance details, AI-assistance disclosure, and an attestation that you reviewed and can explain the material. The contribution guide includes copy-paste examples for every block used here.
