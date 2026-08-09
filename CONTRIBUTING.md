# Contributing to Pingala

Pingala keeps curriculum text in GitHub so every lesson has a visible history, source trail, and review record. The dashboard only publishes content merged into the protected default branch.

## Contribution paths

- **Typos and small corrections:** open an issue or a focused pull request.
- **Mathematical or technical corrections:** include the corrected derivation, source links, and a short explanation of why the current text is wrong.
- **New lessons:** start with a proposal issue, then open a pull request using the subject repository's content layout.
- **Contributor profile:** complete the contributor-profile issue before submitting a new lesson.

You do not need a degree, government ID, or age verification. New lesson authors do need to demonstrate that they understand the material they submit.

## New lesson requirements

Every new lesson must include:

1. a clear audience, prerequisite, and learning objective;
2. authoritative sources for factual or mathematical claims;
3. original wording or an explicit license for reused material;
4. a working checkpoint with an explanation for every answer;
5. an honest `aiAssisted` declaration;
6. an author attestation that the lesson was read, checked, and can be explained;
7. no secrets, tracking scripts, raw HTML, or executable JSX.

## Lesson writing format

Each topic lives in `content/courses/<course>/modules/<module>/topics/<topic>/`:

```text
metadata.yml       # stable ID, title, objectives, sources, licence, author attestation
content.md         # the lesson readers see
checkpoints.yml    # typed self-assessment questions
```

The renderer intentionally supports a small, safe Markdown vocabulary. Use headings,
paragraphs, lists, fenced code, KaTeX, links, and these inline marks:

```md
## A useful idea

This is **important**, this is *emphasis*, and this is ==a reader highlight==.
You can also ~~cross out an outdated phrase~~ or add an image:
![A labelled diagram](https://example.com/diagram.png)
```

Inline links and images must use `https://`, a relative `/asset` URL, or a hash link.
Raw HTML, `javascript:` URLs, scripts, JSX, and arbitrary iframes are rejected.

### Images, graphs, attachments, and embeds

For a full-width visual, use a YAML directive. The same block can represent a chart;
the type tells the reader what it is:

```md
:::image
src: https://example.com/attention-map.png
alt: Heatmap showing attention between tokens
caption: A small attention map for the worked example.
width: 92%
:::

:::chart
src: https://example.com/model-accuracy.svg
alt: Accuracy by training epoch
caption: The validation curve levels off after epoch 18.
:::
```

Use attachments for notebooks, papers, or downloadable resources:

```md
:::attachment
url: https://example.com/lesson-notebook.ipynb
label: Download the worked notebook
description: Jupyter notebook for the tensor broadcasting exercise.
:::
```

Interactive embeds are limited to reviewed hosts such as YouTube, Vimeo, Desmos,
Observable, CodePen, CodeSandbox, and StackBlitz:

```md
:::embed
url: https://www.desmos.com/calculator/example
title: Explore the curve interactively
height: 520
caption: Drag the parameter to see the effect on the function.
:::
```

On the page, images render as labelled figures, charts get the same responsive frame,
attachments become accessible resource cards, and allowed embeds render in a sandboxed
frame. An unapproved embed host becomes a normal safe link instead of executable content.
Keep alt text useful to someone who cannot see the image; never use an image as the only
place where a mathematical or factual explanation appears.

### Math, code, callouts, and checkpoints

```md
:::math The update rule
\\theta_{t+1} = \\theta_t - \\eta \\nabla J(\\theta_t)
:::

:::code python
def step(theta, gradient, learning_rate):
    return theta - learning_rate * gradient
:::

:::tip A useful check
Explain why the learning rate changes the size of the update.
:::
```

Use `metadata.yml` for sources and stable IDs, and put answer explanations in
`checkpoints.yml`. A checkpoint is a learning aid, not a trick question.

AI may help with brainstorming, editing, or formatting. Unreviewed copy-paste from an AI system is not acceptable, and an AI detector is not treated as proof of authorship. Reviewers will check sources, correctness, originality, and whether the author can defend the material.

## Review process

All contributions come through pull requests. Contributors do not receive write access to the organization repositories.

- Small corrections need one curriculum maintainer approval.
- New lessons, derivations, and safety-sensitive topics may need two approvals.
- Automated checks must pass before review is complete.
- A changed lesson is reviewed again; previous approvals are dismissed after substantive changes.
- A maintainer may request a mentored revision instead of rejecting a promising first contribution.

Please keep pull requests narrow and explain the reason for each substantive change.

## Local checks

```sh
npm ci
npm run content:validate
npm run build
npm run lint
```

The `content/` directory in this dashboard repository is the bootstrap copy of the future `pingala-project/ai-ml` repository. Once the subject repository is created, the dashboard's `content-lock.json` must point to an immutable subject commit.
