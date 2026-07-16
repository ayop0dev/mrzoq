# compass.specification.md

# Marzoq Compass Specification (V1)

Version: 1.0

Status: Canonical

Authority Level: Component Canon

Dependencies:

* marzoq.architecture.md
* marzoq.design-system.md
* marzoq.visual.identity.md

---

# Purpose

The Compass is the permanent visual symbol of Marzoq.

It is not an illustration.

It is not decoration.

It is not branding artwork.

It is an interactive guidance instrument that communicates the purpose of Marzoq before any text is read.

The Compass represents direction, confidence, discovery, precision, and intentional movement.

It is simultaneously:

* the visual identity
* the primary interaction object
* the homepage focal point
* the behavioral language of the ecosystem

No alternative hero element may replace the Compass.

---

# Principles

The Compass must always feel:

* Calm
* Precise
* Mechanical
* Elegant
* Intelligent
* Intentional
* Lightweight

It must never feel:

* Futuristic
* Sci-Fi
* Crypto
* Gaming
* Decorative
* Noisy
* Heavy
* Skeuomorphic

Movement communicates intelligence.

Stillness communicates confidence.

Every animation must reinforce guidance.

---

# Responsibilities

The Compass owns:

* the visual center of the homepage
* guidance direction
* user attention
* ecosystem orientation
* homepage interaction origin

The Compass does NOT own:

* navigation menus
* content rendering
* page layout
* floating ecosystem objects
* typography
* business content

---

# Component Hierarchy

Homepage

└── Compass

```
├── Structure Layers

├── Guidance Needle

├── Hub

├── Signal

└── Interaction System
```

The Ecosystem surrounds the Compass.

The Homepage is organized around the Compass.

Nothing visually competes with the Compass.

---

# Visual Anatomy

The Compass is composed of three independent structural layers.

Each layer owns a different responsibility.

Layers never merge.

They animate independently.

---

## Layer 01

Deep Structure

Purpose

Represents the permanent foundation.

Contains:

* outer boundary
* distant rings
* alignment axes

Characteristics

* lowest opacity
* largest radius
* slowest perceived movement
* almost static

This layer should feel architectural.

Never decorative.

---

## Layer 02

Middle Structure

Purpose

Represents the physical instrument.

Contains

* intermediate rings

* structural geometry

* navigation field

* glass boundary

Characteristics

More visible than Layer 01.

Less dominant than Layer 03.

Provides depth.

Never attracts attention.

---

## Layer 03

Core Guidance Layer

Purpose

Represents intentional guidance.

Contains

* Hub

* Needle

* Signal

This is the only layer that actively communicates direction.

Everything else supports it.

---

# Hub

The Hub is the physical center.

It never moves.

It never rotates.

It represents certainty.

Composition

Outer Ring

↓

Inner Ring

↓

Core Point

The Hub always remains perfectly centered.

No animation may offset the Hub position.

---

# Guidance Needle

The Needle represents intentional direction.

It is not a compass needle.

It is Marzoq's guidance vector.

Characteristics

Single axis

↓

Perfectly centered

↓

Solid

↓

Minimal

↓

Mechanical

↓

Precise

No ornamentation.

No gradients.

No glow.

No shadows.

No blur.

---

# Needle Structure

Bottom Counterweight

↓

Main Shaft

↓

Guidance Tip

↓

Signal Ring

Each element has an independent rendering responsibility.

The entire needle rotates as one object.

Individual parts never rotate independently.

---

# Signal Tip

The Signal Tip represents the destination.

It is always positioned at the end of the Needle.

Its position changes only through Needle rotation or signal stretching.

It never animates independently.

---

# Signal Ring

The Signal Ring represents active sensing.

It surrounds the Signal Tip.

It is passive.

No pulsing.

No radar effect.

No repeated scaling.

Its presence alone communicates precision.

---

# SVG Architecture

The Compass must be rendered entirely using SVG.

Raster assets are forbidden.

Canvas rendering is forbidden.

The SVG consists of independent groups.

<svg>

Layer Deep

Layer Mid

Layer Core

Hub

Needle

Signal

</svg>

Each group must remain independently addressable.

This allows future interaction without restructuring.

---

# DOM Structure

Compass

↓

Stage

↓

SVG

↓

Layer Deep

↓

Layer Mid

↓

Layer Core

↓

Hub

↓

Needle Group

↓

Signal Line

↓

Signal Tip

↓

Signal Ring

DOM order is canonical.

Future implementations must preserve this hierarchy.

No renderer may flatten the hierarchy.

---

# Rendering Ownership

Deep Layer

owns

environmental depth

Middle Layer

owns

instrument body

Core Layer

owns

guidance

Hub

owns

origin

Needle

owns

direction

Signal

owns

destination

Ownership must never overlap.

No visual element should have multiple responsibilities.

---

# Z-Depth

Although rendered in SVG, the Compass conceptually exists in three-dimensional space.

Depth is simulated through layered transforms.

Approximate rendering order:

Deep Layer

↓

Middle Layer

↓

Core Layer

↓

Hub

↓

Needle

↓

Signal

Depth exists to reinforce realism.

Not to create spectacle.

Perspective must remain subtle.

Never exaggerated.

---

# Component States

The Compass has a small number of deterministic states.

Every implementation must preserve these states.

No additional visual states may be introduced.

---

## State 01

Idle

This is the default state.

Characteristics

* perfectly centered
* breathing motion only
* no sudden movement
* no user interaction required
* establishes calmness

The Compass is alive.

It is never frozen.

Its movement should be almost subconscious.

---

## State 02

Attention Tracking

Triggered by desktop pointer movement.

The Compass acknowledges the user's attention.

It never chases the cursor.

It aligns itself toward the user's intention.

Characteristics

* smooth rotation
* inertia
* shortest-angle interpolation
* continuous movement

The Compass never snaps.

It never jitters.

It never oscillates.

---

## State 03

Focus

Occurs when the Guidance Needle aligns with an Ecosystem object.

The Compass itself does not change.

Instead,

the surrounding ecosystem responds.

This reinforces that the Compass guides rather than reacts.

The Compass remains calm.

The world around it acknowledges its direction.

---

## State 04

Reduced Motion

Activated through

prefers-reduced-motion.

Characteristics

* breathing disabled
* parallax disabled
* inertia reduced
* signal stretching disabled

Needle rotation remains functional.

Navigation remains functional.

Identity remains intact.

Accessibility must never remove meaning.

---

# Interaction Model

The Compass is interacted with indirectly.

Users never manipulate the Compass itself.

They influence it through attention.

Interaction hierarchy

User

↓

Pointer

↓

Needle

↓

Signal

↓

Ecosystem

↓

Homepage

This interaction chain must never be reversed.

---

# Pointer Behaviour

Desktop pointer movement represents user attention.

The Compass interprets attention.

Not position.

The Needle rotates toward the pointer.

Rotation uses the shortest possible angular path.

Movement must feel:

deliberate

not reactive

The pointer never drags the Compass.

The Compass decides how to respond.

---

# Rotation Rules

Needle rotation owns:

direction only.

It never changes:

scale

opacity

stroke

weight

shape

The visual identity of the Needle is constant.

Only orientation changes.

---

# Angular Behaviour

Rotation is continuous.

Never discrete.

Rotation always follows the shortest angular distance.

Example

340°

↓

10°

The Needle rotates forward 30°

Never backward 330°.

Large spins are forbidden.

---

# Inertia

The Compass has physical presence.

It possesses momentum.

Movement gradually accelerates.

Movement gradually settles.

Movement never instantly starts.

Movement never instantly stops.

The implementation must use interpolation.

Immediate transforms are forbidden.

---

# Signal Behaviour

The Signal extends beyond the Hub.

Its purpose is to communicate intent.

The Signal owns:

length

only.

Direction is inherited from the Needle.

Signal stretching communicates intensity.

Never emotion.

---

# Signal Stretching

The distance between Hub and Signal Tip changes.

The range is bounded.

Minimum

↓

Rest

↓

Maximum

The Signal never leaves the logical boundaries of the instrument.

Stretching must remain subtle.

No elastic effects.

No bounce.

No overshoot.

---

# Parallax Behaviour

The Compass exists inside a spatial environment.

Mouse movement creates environmental perspective.

The instrument tilts.

It does not rotate.

Tilt exists independently from Needle rotation.

Two systems coexist:

Tilt

↓

Needle Direction

Neither controls the other.

---

# Environmental Presence

The Compass breathes.

Breathing is not animation.

It represents existence.

Characteristics

* extremely slow
* low amplitude
* perfectly periodic

The user should notice breathing only after prolonged observation.

---

# Motion Hierarchy

Priority

1.

Needle Rotation

↓

2.

Signal Stretch

↓

3.

Parallax Tilt

↓

4.

Breathing

If performance becomes constrained,

lower-priority motion is reduced first.

Needle rotation is never sacrificed.

---

# Navigation Ownership

The Compass communicates direction.

It does not directly contain navigation UI.

Instead,

each destination exists outside the Compass.

The Needle points toward meaning.

Navigation elements respond.

The relationship is:

Compass

↓

Direction

↓

Destination

Never:

Destination

↓

Move Compass

---

# Ecosystem Integration

The Compass is the origin.

Every Ecosystem object calculates its relationship relative to the Compass center.

The Compass never follows ecosystem objects.

Ecosystem objects react to Compass orientation.

The flow is always:

Needle

↓

Alignment

↓

Object Focus

↓

Visual Emphasis

---

# Focus Detection

When the Needle points toward an Ecosystem element,

that element enters Focus state.

Focus ownership belongs to the Ecosystem.

The Compass remains visually stable.

This creates a feeling of guidance rather than selection.

---

# Timing Philosophy

All movement follows the same philosophy.

Fast enough to feel alive.

Slow enough to feel intentional.

No movement should appear:

robotic

arcade-like

playful

dramatic

The Compass is a precision instrument.

Not an animation showcase.

---

# Forbidden Behaviours

The Compass must never:

* spin continuously
* auto-rotate
* pulse
* glow
* bounce
* shake
* wobble
* overshoot
* vibrate
* flash
* morph
* scale on hover
* change colors during interaction
* blur during motion
* distort perspective
* simulate physics beyond subtle inertia

Every forbidden behavior weakens the perception of confidence.

The Compass should always appear certain of its direction.

---

# Motion Ownership Matrix

Needle

Owns

Direction

Signal

Owns

Reach

Parallax

Owns

Presence

Breathing

Owns

Existence

Ecosystem

Owns

Recognition

Homepage

Owns

Content

Responsibilities must never overlap.

Every animation has exactly one owner.

---

# Accessibility

The Compass is a visual identity element.

It is also an interactive navigation instrument.

Therefore it must satisfy both visual and accessibility requirements.

Accessibility is mandatory.

Never optional.

---

## Keyboard Navigation

The Compass must be fully operable without a pointer.

Keyboard users must be able to:

* enter the Compass
* move between destinations
* identify the current destination
* activate navigation

The navigation model follows the logical direction order.

Focus movement must always be deterministic.

---

## Focus State

Keyboard focus must never rely on color alone.

Focused destinations must expose:

* visible outline
* clear contrast
* unchanged layout

Focus indicators belong to the surrounding navigation targets.

Not the Compass itself.

The Compass remains visually calm.

---

## Screen Readers

The Compass is not announced as an illustration.

It is announced as:

Primary Navigation

or

Guidance Navigation

depending on implementation.

Individual destinations must expose meaningful labels.

Never expose SVG structure.

Never expose implementation details.

---

## Reduced Motion

When

prefers-reduced-motion

is enabled:

Disable

* breathing
* parallax
* environmental drift
* signal stretching

Keep

* navigation
* focus
* needle orientation

Identity must survive reduced motion.

---

# Responsive Behaviour

The Compass exists on every supported viewport.

Its importance never changes.

Only its scale changes.

---

## Desktop

Desktop is the canonical experience.

All interaction systems are enabled.

Includes:

* pointer tracking
* environmental tilt
* breathing
* signal stretching
* ecosystem synchronization

Desktop demonstrates the complete product language.

---

## Tablet

Tablet preserves visual hierarchy.

Pointer interaction becomes optional.

Touch interaction replaces continuous attention tracking.

Motion intensity is reduced.

Identity remains unchanged.

---

## Mobile

Mobile prioritizes clarity.

The Compass remains centered.

Scale is reduced proportionally.

Environmental tilt is disabled.

Pointer tracking is replaced by touch interaction where appropriate.

The Compass must never dominate the viewport.

Content readability always takes priority.

---

# Scaling Rules

The Compass scales proportionally.

Aspect ratio is fixed.

Stretching is forbidden.

Cropping is forbidden.

Independent axis scaling is forbidden.

Every layer scales together.

---

# Rendering Rules

The Compass is rendered once.

Duplicate Compass instances are forbidden.

The Homepage owns the canonical Compass.

No page may create an alternative implementation.

If secondary representations are ever required,

they must reuse the canonical component.

---

# Component API

The Compass exposes a minimal public interface.

Allowed Inputs

* current attention direction
* viewport size
* reduced motion preference
* focus target

Internal State

* current angle
* target angle
* current stretch
* breathing offset
* parallax offset

Outputs

* guidance direction
* ecosystem alignment
* navigation focus

No business data enters the Compass.

No CMS content enters the Compass.

The Compass is presentation logic only.

---

# Performance Requirements

The Compass is part of the first screen.

Its performance directly affects the perceived quality of Marzoq.

Therefore:

Rendering must remain lightweight.

SVG complexity must remain minimal.

Animation must use GPU-friendly transforms.

Layout recalculation during interaction should be avoided.

Only transform and opacity may animate.

Stroke geometry should remain static after initial render.

No unnecessary DOM mutations.

No polling.

No timers.

Use requestAnimationFrame for continuous interaction.

---

# Loading Behaviour

The Compass appears immediately.

No delayed entrance animation.

No dramatic reveal.

No loading spinner.

The homepage begins with the Compass already present.

The experience starts in a calm state.

---

# Failure Behaviour

If JavaScript is unavailable:

The Compass remains visible.

The SVG renders correctly.

The Needle remains in its neutral orientation.

Navigation continues through standard page links.

The product remains understandable.

Animation enhances the experience.

It never defines it.

---

# Maintainability

The Compass must remain understandable by future developers.

Implementation should separate:

Structure

↓

Rendering

↓

Interaction

↓

Animation

↓

Accessibility

Business logic must never be embedded inside the Compass component.

The Compass should remain reusable without modification.

---

# Future Compatibility

Future versions may introduce:

* additional destinations
* richer ecosystem behaviour
* alternative homepage layouts

The Compass itself should require no structural redesign.

Its internal architecture is considered stable.

---

# Canonical Decisions

The following decisions are permanently locked.

✓ SVG is the only rendering technology.

✓ The Compass is always centered.

✓ Three structural layers are mandatory.

✓ The Hub never moves.

✓ The Needle owns direction.

✓ The Signal owns reach.

✓ The Compass never owns business content.

✓ The Compass never owns page layout.

✓ The Ecosystem reacts to the Compass.

✓ Motion communicates guidance.

✓ Animation is always intentional.

✓ Reduced motion preserves meaning.

✓ Desktop defines the canonical experience.

✓ Mobile simplifies interaction, not identity.

---

# Non-Negotiable Rules

The following rules may never be changed during V1.

The Compass:

must never become a logo.

must never become decorative artwork.

must never become an animated toy.

must never become a loading animation.

must never become a background illustration.

must never become a marketing graphic.

must never lose its role as the visual origin of the homepage.

must always represent guidance.

must always communicate certainty.

must always remain visually restrained.

must always preserve its mechanical elegance.

---

# Acceptance Criteria

The Compass implementation is considered complete only when:

✓ All structural layers are rendered.

✓ The Hub remains perfectly centered.

✓ The Needle rotates using shortest-angle interpolation.

✓ Signal stretching remains bounded.

✓ Environmental tilt is subtle.

✓ Breathing motion is nearly imperceptible.

✓ Ecosystem objects can synchronize with the Needle.

✓ Keyboard navigation is supported.

✓ Reduced motion preserves functionality.

✓ SVG renders without JavaScript.

✓ Performance remains suitable for first-screen rendering.

✓ Visual identity matches the Marzoq design language.

---

# Component Status

Component Name

Compass

Version

V1.0

Status

Canonical

Authority

Highest implementation authority for the Compass component.

Any implementation that contradicts this specification is considered non-canonical.
