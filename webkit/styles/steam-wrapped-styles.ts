const STYLE_ID = "steam-wrapped-styles";

const STEAM_WRAPPED_CSS = `
  .steam-wrapped-nav-label {
    display: inline-flex;
    box-sizing: border-box;
    align-items: center;
    width: max-content;
    min-width: 0;
    gap: 6px;
    white-space: nowrap;
  }

  .steam-wrapped-nav-icon {
    display: block;
    width: 14px;
    height: 14px;
    flex: 0 0 auto;
  }

  .steam-wrapped-store-nav-button {
    box-sizing: border-box;
    display: inline-flex !important;
    position: static !important;
    width: 34px !important;
    min-width: 34px !important;
    max-width: 34px !important;
    height: 34px !important;
    min-height: 34px !important;
    max-height: 34px !important;
    flex: 0 1 auto !important;
    margin: 0 8px 0 4px !important;
    padding: 0 !important;
    border: 1px solid rgba(102, 192, 244, .82) !important;
    border-radius: 4px !important;
    align-items: center !important;
    justify-content: center;
    vertical-align: middle;
    background: linear-gradient(180deg, rgba(43, 79, 108, .98), rgba(20, 43, 64, .98)) !important;
    box-shadow: 0 0 6px rgba(102, 192, 244, .5), inset 0 1px 0 rgba(255, 255, 255, .14) !important;
    color: #66c0f4 !important;
    cursor: pointer;
    overflow: visible !important;
    transform: translateY(3px) scale(1);
    transition: transform 140ms ease, background 140ms ease, border-color 140ms ease, box-shadow 140ms ease, color 140ms ease;
    white-space: nowrap;
  }

  .steam-wrapped-store-nav-button .steam-wrapped-nav-label {
    display: inline-flex !important;
    width: 100% !important;
    height: 100% !important;
    min-width: 0 !important;
    max-width: 100%;
    flex: 0 0 auto !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 0 !important;
    white-space: nowrap !important;
  }

  .steam-wrapped-store-nav-button:hover,
  .steam-wrapped-store-nav-button:focus-visible {
    border-color: #8bd7ff !important;
    background: linear-gradient(180deg, rgba(57, 108, 145, 1), rgba(24, 57, 84, 1)) !important;
    box-shadow: 0 0 10px rgba(102, 192, 244, .82), 0 0 18px rgba(102, 192, 244, .36), inset 0 1px 0 rgba(255, 255, 255, .2) !important;
    color: #d9f4ff !important;
    outline: none;
    transform: translateY(3px) scale(1.06);
  }

  .steam-wrapped-store-nav-button:active {
    background: linear-gradient(180deg, rgba(26, 58, 84, 1), rgba(15, 32, 49, 1)) !important;
    box-shadow: 0 0 5px rgba(102, 192, 244, .55), inset 0 1px 3px rgba(0, 0, 0, .45) !important;
    transform: translateY(3px) scale(1.02);
  }

  .steam-wrapped-nav-host {
    overflow: visible !important;
  }

  body.steam-wrapped-page-active > :not(#steam-wrapped-page-root) {
    display: none !important;
  }

  #steam-wrapped-page-root.steam-wrapped-page {
    box-sizing: border-box;
    min-height: 100vh;
    width: 100%;
    padding: clamp(28px, 5vw, 72px) clamp(20px, 7vw, 112px);
    background:
      radial-gradient(circle at 86% -8%, rgba(48, 111, 164, .24), transparent 34%),
      linear-gradient(135deg, #101c2a 0%, #162536 51%, #101b29 100%);
    color: #d6d7d8;
    font-family: "Motiva Sans", Arial, Helvetica, sans-serif;
  }

  .steam-wrapped-dashboard {
    width: min(100%, 1120px);
    margin: 0 auto;
  }

  /* This is the precise export target. The Share controls are a sibling, so
     no Steam chrome, page margin, or export UI can enter the PNG. */
  .steam-wrapped-dashboard__capture {
    position: relative;
    width: 100%;
  }

  .steam-wrapped-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 20px;
  }

  .steam-wrapped-header__identity {
    display: flex;
    gap: 14px;
    align-items: center;
    min-width: 0;
  }

  .steam-wrapped-header__icon {
    display: grid;
    width: 48px;
    height: 48px;
    flex: 0 0 48px;
    place-items: center;
    border: 1px solid rgba(102, 192, 244, .32);
    border-radius: 10px;
    background: linear-gradient(145deg, rgba(55, 130, 184, .34), rgba(25, 51, 77, .82));
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, .08), 0 7px 20px rgba(0, 0, 0, .18);
    color: #66c0f4;
  }

  .steam-wrapped-header-icon {
    width: 25px;
    height: 25px;
  }

  .steam-wrapped-header h1,
  .steam-wrapped-header p,
  .steam-wrapped-hero p {
    margin: 0;
  }

  .steam-wrapped-header h1 {
    overflow: hidden;
    color: #f1f5f7;
    font-size: 28px;
    font-weight: 500;
    line-height: 31px;
    letter-spacing: .01em;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .steam-wrapped-header__period {
    margin-top: 5px !important;
    color: #66c0f4;
    font-size: 14px;
    line-height: 18px;
  }

  .steam-wrapped-period-selector {
    position: relative;
    /* Keep the menu above the hero's positioned content, which also uses
       z-index: 1 and otherwise wins because it appears later in the DOM. */
    z-index: 20;
    flex: 0 0 auto;
  }

  .steam-wrapped-period-selector__button {
    display: inline-flex;
    min-width: 150px;
    min-height: 42px;
    gap: 14px;
    align-items: center;
    justify-content: space-between;
    padding: 0 13px 0 15px;
    border: 1px solid rgba(114, 150, 180, .5);
    border-radius: 4px;
    background: linear-gradient(180deg, rgba(54, 78, 101, .92), rgba(31, 51, 70, .96));
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, .07), 0 4px 12px rgba(0, 0, 0, .18);
    color: #d6d7d8;
    cursor: pointer;
    font: 14px "Motiva Sans", Arial, Helvetica, sans-serif;
    text-align: left;
    transition: border-color 130ms ease, background 130ms ease, color 130ms ease;
  }

  .steam-wrapped-period-selector__button:hover,
  .steam-wrapped-period-selector__button:focus {
    outline: 0;
    border-color: #67c1f5;
    background: linear-gradient(180deg, #3b6686, #284b69);
    color: #fff;
  }

  .steam-wrapped-period-selector__chevron {
    color: #8f98a0;
    font-size: 19px;
    line-height: 1;
    transform: translateY(-2px);
  }

  .steam-wrapped-period-selector__menu {
    position: absolute;
    top: calc(100% + 7px);
    right: 0;
    z-index: 21;
    width: 190px;
    padding: 5px;
    border: 1px solid #4d7191;
    border-radius: 4px;
    background: linear-gradient(180deg, #263f57, #172a3c);
    box-shadow: 0 12px 28px rgba(0, 0, 0, .45);
  }

  .steam-wrapped-period-selector__option {
    display: block;
    width: 100%;
    padding: 9px 10px;
    border: 0;
    border-radius: 2px;
    background: transparent;
    color: #d6d7d8;
    cursor: pointer;
    font: 14px "Motiva Sans", Arial, Helvetica, sans-serif;
    text-align: left;
  }

  .steam-wrapped-period-selector__option:hover,
  .steam-wrapped-period-selector__option:focus,
  .steam-wrapped-period-selector__option[aria-selected="true"] {
    outline: 0;
    background: rgba(102, 192, 244, .18);
    color: #fff;
  }

  .steam-wrapped-custom-range {
    display: flex;
    gap: 7px;
    align-items: flex-end;
    justify-content: flex-end;
    flex-wrap: wrap;
    margin-top: 9px;
    color: #8f98a0;
    font-size: 12px;
  }

  .steam-wrapped-custom-range[hidden] {
    display: none;
  }

  .steam-wrapped-custom-range__fields {
    display: inline-flex;
    gap: 7px;
    align-items: center;
  }

  .steam-wrapped-custom-range__validation {
    flex: 1 1 100%;
    min-height: 14px;
    color: #e36c72;
    font-size: 11px;
    text-align: right;
  }

  .steam-wrapped-custom-range__actions {
    display: inline-flex;
    gap: 6px;
  }

  .steam-wrapped-custom-range__apply,
  .steam-wrapped-custom-range__cancel {
    min-height: 31px;
    padding: 5px 10px;
    border: 1px solid #41627f;
    border-radius: 3px;
    background: #1b3852;
    color: #d6d7d8;
    cursor: pointer;
    font: 12px "Motiva Sans", Arial, Helvetica, sans-serif;
  }

  .steam-wrapped-custom-range__apply:hover,
  .steam-wrapped-custom-range__apply:focus,
  .steam-wrapped-custom-range__cancel:hover,
  .steam-wrapped-custom-range__cancel:focus {
    outline: 0;
    border-color: #67c1f5;
    color: #fff;
  }

  .steam-wrapped-custom-range__apply:disabled {
    border-color: #324b61;
    background: #15283a;
    color: #687783;
    cursor: default;
  }

  .steam-wrapped-custom-range__date {
    box-sizing: border-box;
    width: 126px;
    min-height: 31px;
    padding: 5px 7px;
    border: 1px solid #41627f;
    border-radius: 3px;
    background: #101d2b;
    color: #d6d7d8;
    color-scheme: dark;
    font: 12px "Motiva Sans", Arial, Helvetica, sans-serif;
  }

  .steam-wrapped-custom-range__date:focus {
    outline: 1px solid #67c1f5;
    border-color: #67c1f5;
  }

  .steam-wrapped-hero {
    position: relative;
    min-height: 174px;
    overflow: hidden;
    border: 1px solid rgba(99, 155, 196, .32);
    border-radius: 12px;
    background:
      radial-gradient(ellipse at 9% 120%, rgba(39, 134, 204, .58), transparent 48%),
      radial-gradient(circle at 86% 11%, rgba(108, 207, 255, .15), transparent 28%),
      linear-gradient(116deg, #173b59 0%, #1c3348 48%, #142535 100%);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, .08), 0 14px 34px rgba(0, 0, 0, .24);
  }

  .steam-wrapped-hero::before,
  .steam-wrapped-hero::after {
    position: absolute;
    display: block;
    width: 420px;
    height: 420px;
    border: 1px solid rgba(122, 209, 255, .12);
    border-radius: 50%;
    content: "";
    pointer-events: none;
  }

  .steam-wrapped-hero::before {
    top: -245px;
    right: -90px;
    box-shadow: 0 0 0 58px rgba(103, 197, 244, .035), 0 0 0 117px rgba(103, 197, 244, .025);
  }

  .steam-wrapped-hero::after {
    bottom: -345px;
    left: 43%;
    border-color: rgba(255, 255, 255, .07);
  }

  .steam-wrapped-hero__content {
    position: relative;
    z-index: 1;
    display: flex;
    box-sizing: border-box;
    min-height: 174px;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    padding: 20px 28px;
    text-align: left;
  }

  .steam-wrapped-hero__eyebrow {
    color: #b7dffa;
    font-size: 14px;
    font-weight: 400;
    letter-spacing: 0;
    text-transform: none;
  }

  .steam-wrapped-hero__hours {
    margin-top: 4px !important;
    color: #f5fbff;
    font-size: clamp(44px, 5.8vw, 62px);
    font-weight: 500;
    letter-spacing: -.04em;
    line-height: 1;
    text-shadow: 0 3px 20px rgba(0, 0, 0, .24);
  }

  .steam-wrapped-hero__context {
    margin-top: 6px !important;
    color: #c7d5e0;
    font-size: 14px;
  }

  .steam-wrapped-statistics-row {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    grid-auto-rows: 1fr;
    gap: 12px;
    margin-top: 12px;
  }

  .steam-wrapped-stat-card {
    box-sizing: border-box;
    display: flex;
    min-width: 0;
    min-height: 164px;
    flex-direction: column;
    padding: 14px 17px 15px;
    border: 1px solid rgba(104, 140, 169, .2);
    border-radius: 8px;
    background:
      linear-gradient(145deg, rgba(39, 60, 79, .88), rgba(21, 35, 50, .96));
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, .035), 0 8px 18px rgba(0, 0, 0, .16);
    color: #d6d7d8;
    transition: transform 140ms ease, border-color 140ms ease, background 140ms ease, box-shadow 140ms ease;
  }

  .steam-wrapped-stat-card:hover {
    z-index: 0;
    border-color: rgba(102, 192, 244, .46);
    background: linear-gradient(145deg, rgba(45, 72, 96, .96), rgba(23, 40, 58, .98));
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, .06), 0 11px 23px rgba(0, 0, 0, .24);
    transform: translateY(-1px);
  }

  .steam-wrapped-stat-card__heading {
    display: flex;
    min-width: 0;
    gap: 10px;
    align-items: center;
  }

  .steam-wrapped-stat-card__icon {
    display: grid;
    width: 38px;
    height: 38px;
    flex: 0 0 38px;
    place-items: center;
    border-radius: 50%;
  }

  .steam-wrapped-stat-card[data-tone="blue"] .steam-wrapped-stat-card__icon {
    background: linear-gradient(145deg, rgba(52, 132, 210, .84), rgba(30, 82, 139, .92));
    color: #a8dcff;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, .11), 0 3px 10px rgba(23, 79, 130, .26);
  }

  .steam-wrapped-stat-card[data-tone="purple"] .steam-wrapped-stat-card__icon {
    background: linear-gradient(145deg, rgba(125, 78, 205, .86), rgba(78, 48, 145, .94));
    color: #dfc8ff;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, .1), 0 3px 10px rgba(61, 35, 119, .26);
  }

  .steam-wrapped-stat-card[data-tone="gold"] .steam-wrapped-stat-card__icon {
    background: linear-gradient(145deg, rgba(193, 151, 49, .88), rgba(128, 91, 28, .96));
    color: #ffe8a1;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, .1), 0 3px 10px rgba(111, 76, 20, .25);
  }

  .steam-wrapped-stat-card[data-tone="green"] .steam-wrapped-stat-card__icon {
    background: linear-gradient(145deg, rgba(67, 151, 91, .88), rgba(39, 100, 59, .96));
    color: #c6ffad;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, .1), 0 3px 10px rgba(32, 87, 46, .25);
  }

  .steam-wrapped-stat-card__icon-svg {
    width: 23px;
    height: 23px;
  }

  .steam-wrapped-stat-card__title,
  .steam-wrapped-stat-card__value,
  .steam-wrapped-stat-card__unit,
  .steam-wrapped-stat-card__detail,
  .steam-wrapped-stat-card__comparison {
    margin: 0;
  }

  /* Steam's Store theme has a body.v7 h2 rule with higher specificity than a
     bare component class. Scope these headings to our page so the intended
     compact card typography wins in both the live view and PNG export. */
  #steam-wrapped-page-root .steam-wrapped-stat-card__title {
    overflow: hidden;
    color: #dde6ed;
    font-size: 13px;
    font-weight: 400;
    line-height: 17px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .steam-wrapped-stat-card__value {
    overflow: hidden;
    margin-top: 14px;
    color: #f2f6f8;
    font-size: 28px;
    font-weight: 500;
    letter-spacing: -.025em;
    line-height: 30px;
    text-overflow: ellipsis;
    text-shadow: 0 2px 9px rgba(0, 0, 0, .22);
    white-space: nowrap;
  }

  .steam-wrapped-stat-card[data-value-kind="text"] .steam-wrapped-stat-card__value {
    font-size: 21px;
    letter-spacing: -.01em;
  }

  .steam-wrapped-stat-card__unit,
  .steam-wrapped-stat-card__detail {
    min-height: 16px;
    margin-top: 2px;
    color: #b8c6d1;
    font-size: 12px;
    line-height: 16px;
  }

  .steam-wrapped-stat-card__detail {
    margin-top: 10px;
  }

  .steam-wrapped-stat-card__comparison {
    display: inline-flex;
    min-height: 16px;
    gap: 4px;
    align-items: center;
    margin-top: auto;
    color: #8f98a0;
    font-size: 12px;
    line-height: 16px;
  }

  .steam-wrapped-stat-card__comparison[data-direction="up"] {
    color: #71d68c;
  }

  .steam-wrapped-stat-card__comparison[data-direction="down"] {
    color: #e06b6b;
  }

  .steam-wrapped-stat-card__comparison-icon {
    display: inline-grid;
    width: 11px;
    height: 11px;
    place-items: center;
  }

  .steam-wrapped-stat-card__comparison-svg {
    width: 11px;
    height: 11px;
    stroke-width: 2.5;
  }

  .steam-wrapped-stat-card[data-state="loading"] .steam-wrapped-stat-card__value,
  .steam-wrapped-stat-card[data-state="unavailable"] .steam-wrapped-stat-card__value {
    color: #8f98a0;
  }

  .steam-wrapped-stat-card__unit[hidden],
  .steam-wrapped-stat-card__detail[hidden],
  .steam-wrapped-stat-card__comparison[hidden] {
    display: none;
  }

  @media (max-width: 900px) {
    .steam-wrapped-statistics-row {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 620px) {
    #steam-wrapped-page-root.steam-wrapped-page {
      padding: 26px 18px;
    }

    .steam-wrapped-header {
      align-items: stretch;
      flex-direction: column;
    }

    .steam-wrapped-period-selector__button {
      width: 100%;
    }

    .steam-wrapped-period-selector__menu {
      right: auto;
      left: 0;
    }

    .steam-wrapped-custom-range {
      justify-content: flex-start;
    }

    .steam-wrapped-hero,
    .steam-wrapped-hero__content {
      min-height: 168px;
    }

    .steam-wrapped-statistics-row {
      grid-template-columns: 1fr;
      gap: 10px;
    }
  }

  .steam-wrapped-gaming-insights {
    margin-top: 12px;
  }

  .steam-wrapped-gaming-insights__grid {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
    gap: 12px;
    align-items: stretch;
  }

  .steam-wrapped-gaming-insights__aside {
    display: grid;
    min-height: 310px;
    grid-template-rows: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .steam-wrapped-insight-card {
    box-sizing: border-box;
    min-width: 0;
    overflow: hidden;
    border: 1px solid rgba(104, 140, 169, .22);
    border-radius: 9px;
    background:
      radial-gradient(circle at 104% -16%, rgba(79, 152, 208, .1), transparent 42%),
      linear-gradient(145deg, rgba(35, 56, 75, .92), rgba(18, 32, 47, .98));
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, .04), 0 8px 18px rgba(0, 0, 0, .17);
    color: #d6d7d8;
    transition: transform 140ms ease, border-color 140ms ease, background 140ms ease, box-shadow 140ms ease;
  }

  .steam-wrapped-insight-card:hover {
    z-index: 0;
    border-color: rgba(102, 192, 244, .46);
    background:
      radial-gradient(circle at 104% -16%, rgba(86, 170, 229, .17), transparent 42%),
      linear-gradient(145deg, rgba(43, 70, 94, .98), rgba(21, 39, 57, .99));
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, .06), 0 11px 23px rgba(0, 0, 0, .24);
    transform: translateY(-1px);
  }

  .steam-wrapped-insight-card--most-played {
    display: flex;
    min-height: 310px;
    flex-direction: column;
    padding: 15px 16px 16px;
    cursor: pointer;
  }

  .steam-wrapped-insight-card--longest-session,
  .steam-wrapped-insight-card--peak-play-time {
    display: flex;
    min-height: 0;
    flex-direction: column;
    padding: 15px 16px;
  }

  .steam-wrapped-insight-card--longest-session {
    cursor: pointer;
  }

  .steam-wrapped-insight-card__heading {
    display: flex;
    min-width: 0;
    gap: 8px;
    align-items: center;
  }

  .steam-wrapped-insight-card__title-icon {
    display: grid;
    width: 21px;
    height: 21px;
    flex: 0 0 21px;
    place-items: center;
    border-radius: 50%;
    background: rgba(46, 117, 175, .2);
    color: #67c1f5;
  }

  .steam-wrapped-insight-card--longest-session .steam-wrapped-insight-card__title-icon {
    background: rgba(70, 132, 197, .18);
    color: #78c5f4;
  }

  .steam-wrapped-insight-card--peak-play-time .steam-wrapped-insight-card__title-icon {
    background: rgba(112, 77, 205, .18);
    color: #ae8dff;
  }

  .steam-wrapped-insight-card__title-icon-svg {
    width: 14px;
    height: 14px;
  }

  .steam-wrapped-insight-card__title,
  .steam-wrapped-most-played-game-card__name,
  .steam-wrapped-most-played-game-card__playtime,
  .steam-wrapped-longest-session-card__duration,
  .steam-wrapped-longest-session-card__started-at,
  .steam-wrapped-longest-session-card__start-context,
  .steam-wrapped-longest-session-card__game-name,
  .steam-wrapped-peak-play-time-card__hour,
  .steam-wrapped-peak-play-time-card__description,
  .steam-wrapped-playtime-histogram__message {
    margin: 0;
  }

  #steam-wrapped-page-root .steam-wrapped-insight-card__title {
    overflow: hidden;
    color: #e3edf4;
    font-size: 14px;
    font-weight: 500;
    line-height: 20px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .steam-wrapped-game-artwork {
    position: relative;
    overflow: hidden;
    background: #111e2c;
  }

  .steam-wrapped-game-artwork--wide {
    width: 100%;
    min-height: 0;
    height: auto;
    flex: 1 1 auto;
    margin-top: 12px;
    border: 1px solid rgba(129, 173, 205, .16);
    border-radius: 6px;
  }

  .steam-wrapped-game-artwork--compact {
    width: 27px;
    height: 27px;
    flex: 0 0 27px;
    border: 1px solid rgba(130, 176, 207, .2);
    border-radius: 4px;
  }

  .steam-wrapped-game-artwork__image,
  .steam-wrapped-game-artwork__fallback {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
  }

  .steam-wrapped-game-artwork__image {
    object-fit: cover;
    object-position: center;
    user-select: none;
    -webkit-user-drag: none;
  }

  .steam-wrapped-game-artwork__fallback {
    display: grid;
    place-items: center;
    background:
      radial-gradient(circle at 74% 20%, rgba(74, 150, 208, .25), transparent 33%),
      linear-gradient(135deg, #233d57, #152839 56%, #101e2c);
    color: rgba(202, 221, 235, .72);
    text-align: center;
  }

  /* Steam's global styles can override the browser's native [hidden] rule.
     Without this explicit rule, the fallback grid sits on top of a loaded img. */
  .steam-wrapped-game-artwork__image[hidden],
  .steam-wrapped-game-artwork__fallback[hidden] {
    display: none !important;
  }

  .steam-wrapped-game-artwork__fallback::before {
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(135deg, rgba(255, 255, 255, .025) 0 1px, transparent 1px 8px);
    content: "";
  }

  .steam-wrapped-game-artwork__fallback-label {
    position: relative;
    z-index: 1;
    max-width: 80%;
    font-size: 12px;
    line-height: 16px;
  }

  .steam-wrapped-game-artwork--compact .steam-wrapped-game-artwork__fallback-label {
    display: none;
  }

  .steam-wrapped-most-played-game-card__content {
    min-width: 0;
    flex: 0 0 auto;
    margin-top: auto;
    padding-top: 10px;
  }

  .steam-wrapped-most-played-game-card__target {
    box-sizing: border-box;
    appearance: none;
    display: flex;
    flex: 1 1 auto;
    min-height: 0;
    flex-direction: column;
    width: 100%;
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    user-select: none;
  }

  .steam-wrapped-most-played-game-card__target:hover,
  .steam-wrapped-most-played-game-card__target:focus-visible {
    outline: none;
    filter: brightness(1.06);
  }

  .steam-wrapped-most-played-game-card__target:focus-visible {
    border-radius: 6px;
    box-shadow: 0 0 0 2px rgba(102, 192, 244, .72);
  }

  .steam-wrapped-most-played-game-card__target:disabled {
    cursor: default;
  }

  .steam-wrapped-most-played-game-card__name {
    overflow: hidden;
    color: #f0f5f8;
    font-size: 23px;
    font-weight: 500;
    letter-spacing: -.02em;
    line-height: 27px;
    text-overflow: ellipsis;
    text-shadow: 0 2px 9px rgba(0, 0, 0, .22);
    white-space: nowrap;
  }

  .steam-wrapped-most-played-game-card__playtime {
    display: flex;
    min-height: 24px;
    gap: 5px;
    align-items: baseline;
    margin-top: 3px;
    line-height: 20px;
  }

  .steam-wrapped-most-played-game-card__playtime[hidden] {
    display: none !important;
  }

  .steam-wrapped-most-played-game-card__playtime-value {
    color: #66c0f4;
    font-size: 21px;
    font-weight: 500;
    letter-spacing: -.02em;
    line-height: 24px;
  }

  .steam-wrapped-most-played-game-card__playtime-detail {
    color: #b8c6d1;
    font-size: 12px;
    line-height: 16px;
  }

  .steam-wrapped-longest-session-card__content,
  .steam-wrapped-peak-play-time-card__content {
    display: flex;
    min-height: 0;
    flex: 1 1 auto;
    flex-direction: column;
  }

  .steam-wrapped-longest-session-card__duration,
  .steam-wrapped-peak-play-time-card__hour {
    min-height: 36px;
    margin-top: 8px;
    padding-bottom: 1px;
    color: #f3f7f9;
    font-size: 29px;
    font-weight: 500;
    letter-spacing: -.03em;
    line-height: 36px;
    text-shadow: 0 2px 9px rgba(0, 0, 0, .22);
    white-space: nowrap;
  }

  .steam-wrapped-longest-session-card[data-state="empty"] .steam-wrapped-longest-session-card__duration,
  .steam-wrapped-longest-session-card[data-state="loading"] .steam-wrapped-longest-session-card__duration,
  .steam-wrapped-longest-session-card[data-state="unavailable"] .steam-wrapped-longest-session-card__duration,
  .steam-wrapped-longest-session-card[data-state="error"] .steam-wrapped-longest-session-card__duration,
  .steam-wrapped-peak-play-time-card[data-state="empty"] .steam-wrapped-peak-play-time-card__hour,
  .steam-wrapped-peak-play-time-card[data-state="loading"] .steam-wrapped-peak-play-time-card__hour,
  .steam-wrapped-peak-play-time-card[data-state="unavailable"] .steam-wrapped-peak-play-time-card__hour,
  .steam-wrapped-peak-play-time-card[data-state="error"] .steam-wrapped-peak-play-time-card__hour {
    color: #9ba8b2;
    font-size: 16px;
    font-weight: 400;
    letter-spacing: 0;
    line-height: 21px;
    white-space: normal;
  }

  .steam-wrapped-most-played-game-card[data-state="empty"] .steam-wrapped-most-played-game-card__name,
  .steam-wrapped-most-played-game-card[data-state="loading"] .steam-wrapped-most-played-game-card__name,
  .steam-wrapped-most-played-game-card[data-state="unavailable"] .steam-wrapped-most-played-game-card__name,
  .steam-wrapped-most-played-game-card[data-state="error"] .steam-wrapped-most-played-game-card__name {
    color: #9ba8b2;
    font-size: 17px;
    font-weight: 400;
    letter-spacing: 0;
    line-height: 22px;
    white-space: normal;
  }

  .steam-wrapped-longest-session-card__started-at,
  .steam-wrapped-longest-session-card__start-context,
  .steam-wrapped-peak-play-time-card__description {
    color: #aebfcb;
    font-size: 12px;
    line-height: 16px;
  }

  .steam-wrapped-longest-session-card__started-at {
    margin-top: 2px;
  }

  .steam-wrapped-longest-session-card__start-context {
    margin-top: 1px;
    color: #8f98a0;
  }

  .steam-wrapped-longest-session-card__game {
    box-sizing: border-box;
    appearance: none;
    display: flex;
    width: 100%;
    min-width: 0;
    gap: 8px;
    align-items: center;
    margin-top: auto;
    padding-top: 7px;
    padding-right: 0;
    padding-bottom: 0;
    padding-left: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    user-select: none;
  }

  .steam-wrapped-longest-session-card__game:hover,
  .steam-wrapped-longest-session-card__game:focus-visible {
    outline: none;
    filter: brightness(1.06);
  }

  .steam-wrapped-longest-session-card__game:focus-visible {
    border-radius: 4px;
    box-shadow: 0 0 0 2px rgba(102, 192, 244, .72);
  }

  .steam-wrapped-longest-session-card__game:disabled {
    cursor: default;
  }

  .steam-wrapped-longest-session-card__game-name {
    overflow: hidden;
    color: #c7d5e0;
    font-size: 13px;
    line-height: 18px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .steam-wrapped-peak-play-time-card__description {
    max-width: 190px;
    margin-top: 1px;
  }

  .steam-wrapped-playtime-histogram {
    margin-top: auto;
    padding-top: 7px;
  }

  .steam-wrapped-playtime-histogram__bars {
    display: flex;
    height: 48px;
    gap: 2px;
    align-items: flex-end;
  }

  .steam-wrapped-playtime-histogram__bar {
    display: flex;
    height: 100%;
    min-width: 0;
    flex: 1 1 0;
    align-items: flex-end;
  }

  .steam-wrapped-playtime-histogram__bar-fill {
    display: block;
    width: 100%;
    height: var(--steam-wrapped-playtime-histogram-height, 0%);
    min-height: 1px;
    border-radius: 2px 2px 0 0;
    background: linear-gradient(180deg, #6f70ff, #3977d0);
    box-shadow: 0 0 7px rgba(99, 121, 255, .26);
    opacity: .26;
    transition: height 180ms ease, opacity 180ms ease, background 180ms ease;
  }

  .steam-wrapped-playtime-histogram__bar:not([data-value="0"]) .steam-wrapped-playtime-histogram__bar-fill {
    min-height: 4px;
    opacity: .78;
  }

  .steam-wrapped-playtime-histogram__bar[data-peak="true"] .steam-wrapped-playtime-histogram__bar-fill {
    background: linear-gradient(180deg, #ba8dff, #7760ef);
    box-shadow: 0 0 10px rgba(161, 112, 255, .62);
    opacity: 1;
  }

  .steam-wrapped-playtime-histogram__axis {
    display: flex;
    justify-content: space-between;
    margin-top: 4px;
    color: #7f94a5;
    font-size: 9px;
    line-height: 12px;
  }

  .steam-wrapped-playtime-histogram__axis-label:last-child {
    text-align: right;
  }

  .steam-wrapped-playtime-histogram__message {
    margin-top: 4px;
    color: #8f98a0;
    font-size: 11px;
    line-height: 14px;
  }

  .steam-wrapped-playtime-histogram[data-state="normal"] .steam-wrapped-playtime-histogram__message {
    display: none;
  }

  .steam-wrapped-playtime-histogram:not([data-state="normal"]) .steam-wrapped-playtime-histogram__axis {
    opacity: .35;
  }

  @media (max-width: 900px) {
    .steam-wrapped-gaming-insights__grid {
      grid-template-columns: 1fr;
    }

    .steam-wrapped-gaming-insights__aside {
      min-height: 0;
    }

    .steam-wrapped-insight-card--longest-session,
    .steam-wrapped-insight-card--peak-play-time {
      min-height: 156px;
    }
  }

  @media (max-width: 620px) {
    .steam-wrapped-gaming-insights__grid,
    .steam-wrapped-gaming-insights__aside {
      gap: 10px;
    }

    .steam-wrapped-insight-card--most-played {
      min-height: 300px;
      padding: 14px;
    }

    .steam-wrapped-insight-card--longest-session,
    .steam-wrapped-insight-card--peak-play-time {
      padding: 14px;
    }

    .steam-wrapped-game-artwork--wide {
      height: clamp(158px, 44vw, 200px);
    }
  }

  .steam-wrapped-recent-activity {
    margin-top: 12px;
  }

  .steam-wrapped-recent-activity__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-auto-rows: 1fr;
    gap: 12px;
    align-items: stretch;
  }

  .steam-wrapped-period-list-card,
  .steam-wrapped-activity-card {
    box-sizing: border-box;
    display: flex;
    min-width: 0;
    min-height: 216px;
    flex-direction: column;
    padding: 13px 14px;
    border: 1px solid rgba(104, 140, 169, .22);
    border-radius: 9px;
    background:
      radial-gradient(circle at 104% -16%, rgba(79, 152, 208, .1), transparent 42%),
      linear-gradient(145deg, rgba(35, 56, 75, .92), rgba(18, 32, 47, .98));
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, .04), 0 8px 18px rgba(0, 0, 0, .17);
    color: #d6d7d8;
    transition: transform 140ms ease, border-color 140ms ease, background 140ms ease, box-shadow 140ms ease;
  }

  .steam-wrapped-period-list-card:hover,
  .steam-wrapped-activity-card:hover {
    z-index: 0;
    border-color: rgba(102, 192, 244, .46);
    background:
      radial-gradient(circle at 104% -16%, rgba(86, 170, 229, .17), transparent 42%),
      linear-gradient(145deg, rgba(43, 70, 94, .98), rgba(21, 39, 57, .99));
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, .06), 0 11px 23px rgba(0, 0, 0, .24);
    transform: translateY(-1px);
  }

  .steam-wrapped-period-list-card__header,
  .steam-wrapped-activity-card__heading {
    display: flex;
    min-width: 0;
    min-height: 22px;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .steam-wrapped-period-list-card__heading {
    display: flex;
    min-width: 0;
    gap: 8px;
    align-items: center;
  }

  .steam-wrapped-period-list-card__title-icon {
    display: grid;
    width: 18px;
    height: 18px;
    flex: 0 0 18px;
    place-items: center;
    color: #f0c654;
  }

  .steam-wrapped-period-list-card__title-icon svg {
    width: 17px;
    height: 17px;
  }

  .steam-wrapped-period-list-card__title,
  .steam-wrapped-activity-card__title,
  .steam-wrapped-achievement-row__name,
  .steam-wrapped-achievement-row__game-name,
  .steam-wrapped-recently-played-card__game-name,
  .steam-wrapped-recently-played-card__playtime,
  .steam-wrapped-period-list-card__status,
  .steam-wrapped-activity-card__message,
  .steam-wrapped-achievements-dialog__title,
  .steam-wrapped-activity-dialog__title {
    margin: 0;
  }

  #steam-wrapped-page-root .steam-wrapped-period-list-card__title,
  #steam-wrapped-page-root .steam-wrapped-activity-card__title {
    overflow: hidden;
    color: #e6eef4;
    font-size: 14px;
    font-weight: 500;
    line-height: 20px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .steam-wrapped-period-list-card__view-all,
  .steam-wrapped-activity-card__view-all {
    min-height: 23px;
    flex: 0 0 auto;
    padding: 3px 8px;
    border: 1px solid rgba(114, 150, 180, .22);
    border-radius: 4px;
    background: rgba(18, 33, 48, .62);
    color: #93a7b8;
    cursor: pointer;
    font: 11px "Motiva Sans", Arial, Helvetica, sans-serif;
    line-height: 15px;
    transition: border-color 130ms ease, background 130ms ease, color 130ms ease;
  }

  .steam-wrapped-period-list-card__view-all:hover,
  .steam-wrapped-period-list-card__view-all:focus,
  .steam-wrapped-activity-card__view-all:hover,
  .steam-wrapped-activity-card__view-all:focus {
    outline: 0;
    border-color: rgba(102, 192, 244, .58);
    background: rgba(47, 92, 124, .62);
    color: #e5f4ff;
  }

  .steam-wrapped-period-list-card__list,
  .steam-wrapped-recently-played-card__list,
  .steam-wrapped-achievements-dialog__list,
  .steam-wrapped-recently-played-card__full-list {
    margin: 8px 0 0;
    padding: 0;
    list-style: none;
  }

  .steam-wrapped-period-list-card__status,
  .steam-wrapped-activity-card__message {
    display: flex;
    min-height: 62px;
    flex: 1 1 auto;
    align-items: center;
    justify-content: center;
    color: #8fa2b1;
    font-size: 13px;
    line-height: 18px;
    text-align: center;
  }

  .steam-wrapped-interactive-row {
    cursor: pointer;
    user-select: none;
    transition: background 140ms ease, box-shadow 140ms ease;
  }

  .steam-wrapped-interactive-row:hover,
  .steam-wrapped-interactive-row:focus-visible {
    outline: none;
    border-radius: 4px;
    background: rgba(102, 192, 244, .1);
  }

  .steam-wrapped-interactive-row:focus-visible {
    box-shadow: 0 0 0 2px rgba(102, 192, 244, .72);
  }

  .steam-wrapped-achievement-row {
    box-sizing: border-box;
    display: grid;
    min-width: 0;
    grid-template-columns: 43px minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
    padding: 3px 0;
  }

  .steam-wrapped-achievement-row + .steam-wrapped-achievement-row,
  .steam-wrapped-recently-played-card__row + .steam-wrapped-recently-played-card__row {
    border-top: 1px solid rgba(111, 143, 168, .12);
  }

  .steam-wrapped-achievement-row__artwork {
    position: relative;
    width: 41px;
    height: 41px;
    overflow: hidden;
    border: 1px solid rgba(133, 174, 204, .3);
    border-radius: 4px;
    background: #142638;
    box-shadow: 0 2px 7px rgba(0, 0, 0, .24);
  }

  .steam-wrapped-achievement-row__image,
  .steam-wrapped-achievement-row__artwork-fallback {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .steam-wrapped-achievement-row__image {
    object-fit: cover;
    user-select: none;
    -webkit-user-drag: none;
  }

  .steam-wrapped-achievement-row__artwork-fallback {
    display: grid;
    place-items: center;
    background:
      radial-gradient(circle at 72% 18%, rgba(218, 178, 71, .26), transparent 34%),
      linear-gradient(145deg, #293b48, #182633);
    color: #dfc16c;
  }

  .steam-wrapped-achievement-row__artwork-fallback svg {
    width: 22px;
    height: 22px;
  }

  .steam-wrapped-achievement-row__details {
    min-width: 0;
  }

  .steam-wrapped-achievement-row__name,
  .steam-wrapped-recently-played-card__game-name {
    overflow: hidden;
    color: #e4edf4;
    font-size: 13px;
    font-weight: 500;
    line-height: 17px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .steam-wrapped-achievement-row__game-name {
    overflow: hidden;
    margin-top: 1px;
    color: #8fa5b5;
    font-size: 11px;
    line-height: 15px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .steam-wrapped-achievement-row__unlocked-at {
    display: flex;
    min-width: 66px;
    flex-direction: column;
    align-items: flex-end;
    color: #a8b9c6;
    font-size: 10px;
    font-style: normal;
    line-height: 15px;
    text-align: right;
    white-space: nowrap;
  }

  .steam-wrapped-achievement-row__time {
    color: #8fa2b1;
  }

  .steam-wrapped-recently-played-card__row {
    box-sizing: border-box;
    appearance: none;
    display: grid;
    width: 100%;
    min-width: 0;
    grid-template-columns: 84px minmax(0, 1fr) auto;
    gap: 9px;
    align-items: center;
    padding: 3px 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
  }

  .steam-wrapped-recently-played-card__row:disabled {
    cursor: default;
  }

  .steam-wrapped-recently-played-card__row + .steam-wrapped-recently-played-card__row {
    border-top: 1px solid rgba(111, 143, 168, .12);
  }

  .steam-wrapped-recently-played-card__artwork.steam-wrapped-game-artwork--compact {
    width: 84px;
    height: 47px;
    flex: 0 0 84px;
    border-color: rgba(130, 176, 207, .24);
    border-radius: 4px;
  }

  .steam-wrapped-recently-played-card__playtime {
    min-width: 38px;
    color: #66c0f4;
    font-size: 12px;
    font-weight: 500;
    line-height: 17px;
    text-align: right;
    white-space: nowrap;
  }

  .steam-wrapped-achievements-dialog,
  .steam-wrapped-activity-dialog {
    box-sizing: border-box;
    width: min(560px, calc(100vw - 36px));
    max-height: min(620px, calc(100vh - 36px));
    margin: auto;
    padding: 0;
    border: 1px solid rgba(102, 192, 244, .44);
    border-radius: 9px;
    background: linear-gradient(145deg, #233c52, #132536);
    box-shadow: 0 22px 60px rgba(0, 0, 0, .62), inset 0 1px 0 rgba(255, 255, 255, .06);
    color: #d6d7d8;
  }

  .steam-wrapped-achievements-dialog:not([open]),
  .steam-wrapped-activity-dialog:not([open]) {
    display: none;
  }

  .steam-wrapped-achievements-dialog::backdrop,
  .steam-wrapped-activity-dialog::backdrop {
    background: rgba(5, 12, 19, .72);
    backdrop-filter: blur(2px);
  }

  /* Older embedded Chromium versions can expose <dialog> without a usable
     native modal top layer. The component adds this class only for that
     in-page fallback, keeping the overlay above Steam's regular content. */
  .steam-wrapped-achievements-dialog.steam-wrapped-dialog--fallback,
  .steam-wrapped-activity-dialog.steam-wrapped-dialog--fallback {
    position: fixed;
    z-index: 10000;
    inset: 0;
    display: flex;
    width: 100vw;
    max-width: none;
    height: 100vh;
    max-height: none;
    align-items: center;
    justify-content: center;
    margin: 0;
    border: 0;
    border-radius: 0;
    background: rgba(5, 12, 19, .72);
    box-shadow: none;
  }

  .steam-wrapped-achievements-dialog.steam-wrapped-dialog--fallback .steam-wrapped-achievements-dialog__panel,
  .steam-wrapped-activity-dialog.steam-wrapped-dialog--fallback .steam-wrapped-activity-dialog__content {
    width: min(560px, calc(100vw - 36px));
    max-height: min(620px, calc(100vh - 36px));
    overflow: hidden;
    border: 1px solid rgba(102, 192, 244, .44);
    border-radius: 9px;
    background: linear-gradient(145deg, #233c52, #132536);
    box-shadow: 0 22px 60px rgba(0, 0, 0, .62), inset 0 1px 0 rgba(255, 255, 255, .06);
  }

  .steam-wrapped-achievements-dialog__panel,
  .steam-wrapped-activity-dialog__content {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    max-height: min(620px, calc(100vh - 36px));
    overflow: hidden;
    padding: 17px 18px 18px;
  }

  .steam-wrapped-achievements-dialog__header,
  .steam-wrapped-activity-dialog__heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .steam-wrapped-achievements-dialog__title,
  .steam-wrapped-activity-dialog__title {
    color: #edf6fb;
    font-size: 18px;
    font-weight: 500;
    line-height: 24px;
  }

  .steam-wrapped-achievements-dialog__close,
  .steam-wrapped-activity-dialog__close {
    min-height: 28px;
    padding: 4px 10px;
    border: 1px solid rgba(114, 150, 180, .34);
    border-radius: 4px;
    background: rgba(18, 33, 48, .8);
    color: #c7d5e0;
    cursor: pointer;
    font: 12px "Motiva Sans", Arial, Helvetica, sans-serif;
  }

  .steam-wrapped-achievements-dialog__close:hover,
  .steam-wrapped-achievements-dialog__close:focus,
  .steam-wrapped-activity-dialog__close:hover,
  .steam-wrapped-activity-dialog__close:focus {
    outline: 0;
    border-color: #67c1f5;
    background: #294d6b;
    color: #fff;
  }

  .steam-wrapped-achievements-dialog__list,
  .steam-wrapped-recently-played-card__full-list {
    margin-top: 12px;
    max-height: min(455px, calc(100vh - 170px));
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-color: rgba(102, 192, 244, .65) rgba(10, 20, 30, .4);
    scrollbar-width: thin;
  }

  .steam-wrapped-achievements-dialog__list,
  .steam-wrapped-recently-played-card__full-list {
    flex: 0 1 auto;
  }

  .steam-wrapped-activity-dialog__sort {
    box-sizing: border-box;
    align-self: flex-start;
    min-height: 28px;
    margin-top: 10px;
    padding: 4px 28px 4px 8px;
    border: 1px solid rgba(114, 150, 180, .34);
    border-radius: 4px;
    background: rgba(18, 33, 48, .8);
    color: #c7d5e0;
    cursor: pointer;
    font: 12px "Motiva Sans", Arial, Helvetica, sans-serif;
  }

  .steam-wrapped-activity-dialog__sort:focus {
    outline: 0;
    border-color: #67c1f5;
  }

  .steam-wrapped-achievements-dialog .steam-wrapped-achievement-row,
  .steam-wrapped-recently-played-card__dialog .steam-wrapped-recently-played-card__row {
    padding: 9px 0;
  }

  /* Steam's global stylesheet can override native hidden behavior. */
  .steam-wrapped-period-list-card__view-all[hidden],
  .steam-wrapped-activity-card__view-all[hidden],
  .steam-wrapped-period-list-card__status[hidden],
  .steam-wrapped-activity-card__message[hidden],
  .steam-wrapped-period-list-card__list[hidden],
  .steam-wrapped-recently-played-card__list[hidden],
  .steam-wrapped-achievement-row__image[hidden],
  .steam-wrapped-achievement-row__artwork-fallback[hidden],
  .steam-wrapped-achievements-dialog[hidden],
  .steam-wrapped-activity-dialog[hidden],
  .steam-wrapped-activity-dialog__sort[hidden] {
    display: none !important;
  }

  @media (max-width: 520px) {
    .steam-wrapped-recent-activity__grid {
      grid-template-columns: 1fr;
      gap: 10px;
    }

    .steam-wrapped-period-list-card,
    .steam-wrapped-activity-card {
      min-height: 0;
    }
  }

  .steam-wrapped-share-summary {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin-top: 16px;
    padding: 1px 0 8px;
  }

  .steam-wrapped-share-summary__button {
    display: inline-flex;
    width: min(258px, 100%);
    min-height: 34px;
    gap: 8px;
    align-items: center;
    justify-content: center;
    padding: 7px 15px;
    border: 1px solid rgba(102, 192, 244, .38);
    border-radius: 6px;
    background: linear-gradient(180deg, #2f7cc3, #1e5b9e);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, .16), 0 6px 15px rgba(0, 0, 0, .24);
    color: #f2f8fc;
    cursor: pointer;
    font: 500 13px "Motiva Sans", Arial, Helvetica, sans-serif;
    line-height: 18px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, .24);
    transition: background 130ms ease, border-color 130ms ease, box-shadow 130ms ease, transform 130ms ease;
  }

  .steam-wrapped-share-summary__button:hover,
  .steam-wrapped-share-summary__button:focus {
    outline: 0;
    border-color: rgba(181, 227, 255, .82);
    background: linear-gradient(180deg, #3b91dc, #2671ba);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, .2), 0 8px 18px rgba(0, 0, 0, .3);
    transform: translateY(-1px);
  }

  .steam-wrapped-share-summary__button:disabled {
    border-color: rgba(102, 192, 244, .2);
    background: linear-gradient(180deg, #315c80, #284865);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, .06);
    color: rgba(230, 241, 250, .72);
    cursor: wait;
    transform: none;
  }

  .steam-wrapped-share-summary__icon {
    display: inline-grid;
    width: 16px;
    height: 16px;
    flex: 0 0 16px;
    place-items: center;
  }

  .steam-wrapped-share-summary__icon-svg {
    width: 16px;
    height: 16px;
  }

  .steam-wrapped-share-summary__caption {
    margin: 6px 0 0;
    color: #8fa5b5;
    font-size: 11px;
    line-height: 15px;
    text-align: center;
  }

  .steam-wrapped-share-summary__status {
    margin: 5px 0 0;
    color: #8fa5b5;
    font-size: 11px;
    line-height: 15px;
    text-align: center;
  }

  .steam-wrapped-share-summary__status[data-tone="success"] {
    color: #8ce28a;
  }

  .steam-wrapped-share-summary__status[data-tone="error"] {
    color: #e89090;
  }

  .steam-wrapped-share-summary__status[hidden] {
    display: none !important;
  }
`;

/** Installs the small, scoped stylesheet once and returns its cleanup function. */
export function installSteamWrappedStyles(): () => void {
  document.getElementById(STYLE_ID)?.remove();

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = STEAM_WRAPPED_CSS;
  document.head.append(style);

  return () => style.remove();
}
