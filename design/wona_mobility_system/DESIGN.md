---
name: Wona Mobility System
colors:
  surface: '#fff8f5'
  surface-dim: '#ead6cc'
  surface-bright: '#fff8f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff1ea'
  surface-container: '#ffeadf'
  surface-container-high: '#f9e4d9'
  surface-container-highest: '#f3dfd4'
  on-surface: '#241913'
  on-surface-variant: '#564337'
  inverse-surface: '#3a2e27'
  inverse-on-surface: '#ffede4'
  outline: '#8a7265'
  outline-variant: '#ddc1b1'
  surface-tint: '#974800'
  primary: '#974800'
  on-primary: '#ffffff'
  primary-container: '#e8791e'
  on-primary-container: '#4f2300'
  inverse-primary: '#ffb688'
  secondary: '#665d52'
  on-secondary: '#ffffff'
  secondary-container: '#ebddd0'
  on-secondary-container: '#6b6156'
  tertiary: '#006494'
  on-tertiary: '#ffffff'
  tertiary-container: '#00a0ea'
  on-tertiary-container: '#00334e'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbc7'
  primary-fixed-dim: '#ffb688'
  on-primary-fixed: '#311300'
  on-primary-fixed-variant: '#733600'
  secondary-fixed: '#eee0d3'
  secondary-fixed-dim: '#d1c4b7'
  on-secondary-fixed: '#211a12'
  on-secondary-fixed-variant: '#4e453b'
  tertiary-fixed: '#cbe6ff'
  tertiary-fixed-dim: '#8fcdff'
  on-tertiary-fixed: '#001e30'
  on-tertiary-fixed-variant: '#004b71'
  background: '#fff8f5'
  on-background: '#241913'
  surface-variant: '#f3dfd4'
typography:
  headline-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Be Vietnam Pro
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Be Vietnam Pro
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-bold:
    fontFamily: Be Vietnam Pro
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
  label-md:
    fontFamily: Be Vietnam Pro
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  container-padding: 20px
  stack-gap: 12px
---

## Brand & Style
The design system is engineered for the fast-paced, high-energy environment of West African logistics. It balances professional reliability with a vibrant, dynamic energy that reflects the movement of urban transport. 

The aesthetic is **Corporate Modern with a Friendly Edge**, prioritizing extreme clarity and ease of use for users who may be navigating the app in bright sunlight or on the move. The visual language uses heavy whitespace and a refined color palette to ensure the interface feels premium yet accessible. The emotional goal is to evoke a sense of "speed with safety"—a trustworthy partner in daily transit and delivery.

## Colors
The palette is dominated by a high-visibility orange, used strategically for primary actions and brand presence. 

- **Primary (#E8791E):** Reserved for "Call to Action" buttons, active state indicators, and critical brand touchpoints.
- **Surface Secondary (#FBEDDF):** Used as a container background for cards and grouped content to create soft nesting without the harshness of borders.
- **Typography & Icons:** Anthracite (#1A1A1A) provides maximum legibility for headers, while Medium Grey (#5A5A5A) is used for supporting metadata and placeholder text.
- **Background:** Pure White (#FFFFFF) serves as the base layer to maximize contrast and perceived cleanliness.

## Typography
The system utilizes **Be Vietnam Pro** for its contemporary, humanist qualities. It offers excellent legibility at small sizes, which is crucial for map labels and delivery details.

- **Headlines:** Use Bold weights with tight letter-spacing to create a sense of urgency and importance.
- **Body:** Regular weights with generous line-height ensure readability during long interactions.
- **Labels:** Used for micro-copy, such as "Estimated Time" or "Driver Name," often paired with icons.
- **Mobile Scaling:** Large headlines scale down on mobile to prevent awkward text wrapping in narrow containers.

## Layout & Spacing
The layout follows a **Fluid Grid** model with a specific focus on thumb-reach zones. 

- **Margins:** A standard 20px horizontal margin is maintained across all mobile screens to prevent content from hitting the edge of the device.
- **Spacing Rhythm:** Based on a 4px baseline, with 16px (md) being the standard padding for cards and buttons.
- **Stacking:** Elements within a flow (like a list of delivery options) should use a 12px gap to maintain a "generous" feel without breaking visual grouping.
- **Touch Targets:** All interactive elements must maintain a minimum height of 48px for ease of use in high-vibration environments (e.g., while riding or walking).

## Elevation & Depth
Depth in this design system is primarily achieved through **Tonal Layers** and **Soft Ambient Shadows**.

- **Level 0 (Background):** White (#FFFFFF).
- **Level 1 (Cards):** Soft Orange (#FBEDDF) with no shadow, or White with a very subtle, diffused 10% opacity shadow (0px 4px 12px).
- **Level 2 (Floating Actions):** Primary Orange buttons use a subtle shadow of the same hue to appear "lifted" and encourage interaction.
- **Overlays:** Full-screen modals and bottom sheets use a 40% black backdrop tint to focus attention on the foreground task.

## Shapes
The shape language is defined by **pronounced, friendly curves**. 

- **Standard Containers:** Use a 16px (`rounded-lg`) corner radius to soften the interface and make the brand feel more approachable.
- **Buttons & Inputs:** Follow the 16px standard to maintain consistency.
- **Visual Logic:** Large radii are used for primary containers (cards, bottom sheets), while smaller 8px radii are used for internal elements like tags or notification badges.

## Components
- **Buttons:** Primary buttons are Solid Orange (#E8791E) with White text. Secondary buttons are Ghost-style with Orange outlines or use the Soft Orange (#FBEDDF) background with Orange text.
- **Cards:** Main content cards use the Soft Orange background to differentiate from the base White page. They should have 16px internal padding and 16px corner radius.
- **Input Fields:** Use a 1px border (#5A5A5A at 20% opacity) that turns Primary Orange when focused. Labels stay above the input for clarity.
- **Chips/Tags:** Used for status (e.g., "En route", "Delivered"). These should be pill-shaped with small 12px font-size.
- **Bottom Sheets:** Central to the mobile experience for selecting addresses or viewing driver details. These must have a visible "handle" at the top and 24px top-corner radii.
- **Lists:** Items are separated by whitespace or the Soft Orange containers rather than hard divider lines to maintain the "clean and airy" aesthetic.