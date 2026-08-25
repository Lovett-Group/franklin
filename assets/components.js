/* ============================================================================
   POST UI System — component behaviour
   HAND-WRITTEN. Plain ES5-compatible DOM code, no build step, no dependencies.

   WHY IT LOOKS LIKE THIS
   The first consumer is WEBFLOW, where this gets pasted into a site-wide "before
   </body>" custom-code embed. That rules out modules, JSX and a bundler, and it
   means the script cannot assume it runs after the DOM (Webflow places embeds in
   several positions) or that it runs only once. So: delegated listeners on
   document, an idempotent init, and everything driven by data-attributes rather
   than by element references captured at load time. The same file drops into a
   React app as a side-effect import until real components exist.

   THE CONTRACT
   Behaviour is attached by data-attribute, styling by class. A component is
   interactive because it has data-post-*, and it LOOKS a certain way because it
   has the matching class — the two are deliberately separable so a designer can
   restyle without breaking behaviour and vice versa.

     data-post-toggle="chip"        toggles .is-selected; emits `post:chipchange`.
                                   Its x DESELECTS — it never removes the chip.
     data-post-value="<v>"          optional: what a chip reports in that event
                                   (defaults to its label text)
     data-post-toggle="check"       toggles .is-checked  (+ the hidden input)
     data-post-radio="<group>"      selects one within the named group
     data-post-accordion           toggles .is-open on the .post-accordion
     data-post-select              opens/closes the panel, writes the value back
     data-post-search              submit: emits a bubbling `post:search` event
     data-post-clear               empties the search field, refocuses it
     data-post-dots                click a dot -> .is-active

   STATE LIVES IN THE DOM. There is no internal store: .is-selected on the element
   IS the state. That is what makes it safe to re-render around, and what lets
   Webflow interactions and this script coexist without fighting.
   ============================================================================ */
(function () {
  'use strict';

  // Guard: Webflow embeds can be injected more than once, and a second set of
  // delegated listeners would toggle every state twice (i.e. not at all).
  if (window.__postUIReady) return;
  window.__postUIReady = true;

  var doc = document;

  function closest(el, sel) {
    while (el && el.nodeType === 1) {
      if (el.matches && el.matches(sel)) return el;
      el = el.parentElement;
    }
    return null;
  }

  function setOpen(el, open) {
    el.classList.toggle('is-open', open);
    var head = el.querySelector('[aria-expanded]');
    if (head) head.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  // ---- click: one delegated listener covers every component -----------------
  doc.addEventListener('click', function (e) {
    var t = e.target;

    // chip / filter toggle
    var chip = closest(t, '[data-post-toggle="chip"]');
    if (chip) {
      // THE X DESELECTS. IT DOES NOT REMOVE.
      //
      // A Chip is the CONTROL — one of the filters you can choose, living in a fixed
      // list. Removing it from the DOM destroyed the control itself: the filter was
      // then unavailable for the rest of the session with no way to get it back, and a
      // list that silently loses options every time someone clears one is broken.
      //
      // This is the line between Chip and Filter Tag, and it is the whole reason they
      // are two components rather than one:
      //   Chip       the control. Persistent. Clearing returns it to unselected.
      //   Filter Tag the applied-state DISPLAY, rendered somewhere else entirely
      //              (a summary row above results). It exists only while its filter is
      //              on, so clearing it means the tag goes away — the page removes it
      //              in response to the state change, it does not remove itself.
      // The control and the state readout are different elements. Deleting the control
      // to express "not applied" confuses the two.
      var on = closest(t, '[data-post-dismiss]')
        ? false                                        // the x always means OFF
        : !chip.classList.contains('is-selected');     // the body toggles
      chip.classList.toggle('is-selected', on);
      chip.setAttribute('aria-pressed', on ? 'true' : 'false');
      // The Filter Tag row lives elsewhere in the DOM and cannot see a class change, so
      // announce it the same way Search Bar announces a submit: a bubbling event, no
      // opinion about what the consumer does with it. Without this there is no way to
      // build the summary-row behaviour the two components are designed for.
      // WHICH ROW this chip sits in lives on the GROUP, never on the chip — the chip
      // markup is identical in both, which is what lets one component serve both roles.
      //   filter    the control row. The x deselects; the chip stays put.
      //   applied   the readout row (what Filter Tag used to be). The x deselects the
      //             SOURCE chip, and the page removes this readout in response.
      // The role rides along in the event so a consumer can tell the two apart without
      // inspecting the DOM upwards for itself.
      var group = closest(chip, '[data-post-chips]');
      chip.dispatchEvent(new CustomEvent('post:chipchange', {
        bubbles: true,
        detail: {
          selected: on,
          role: group ? group.getAttribute('data-post-chips') : 'filter',
          value: chip.getAttribute('data-post-value') ||
                 (chip.querySelector('.post-label') || {}).textContent || ''
        }
      }));
      return;
    }

    // checkbox
    var check = closest(t, '[data-post-toggle="check"]');
    if (check && !check.classList.contains('is-disabled')) {
      // A <label>-wrapped real input already toggles ITSELF on click and then forwards a
      // second click that bubbles back through here. Toggling in both places cancels out
      // and the control looks dead. Where there is a real input the native behaviour wins
      // and the `change` listener below syncs the class; only input-less markup is
      // toggled by hand.
      if (check.querySelector('input')) return;
      var on = !check.classList.contains('is-checked');
      check.classList.toggle('is-checked', on);
      check.setAttribute('aria-checked', on ? 'true' : 'false');
      return;
    }

    // radio — exclusive within its named group
    var radio = closest(t, '[data-post-radio]');
    if (radio && !radio.classList.contains('is-disabled')) {
      if (radio.querySelector('input')) return; // same forwarded-click story as checkbox
      var group = radio.getAttribute('data-post-radio');
      var peers = doc.querySelectorAll('[data-post-radio="' + group + '"]');
      for (var i = 0; i < peers.length; i++) {
        peers[i].classList.toggle('is-selected', peers[i] === radio);
        peers[i].setAttribute('aria-checked', peers[i] === radio ? 'true' : 'false');
      }
      return;
    }

    // accordion
    var accHead = closest(t, '[data-post-accordion]');
    if (accHead) {
      var acc = closest(accHead, '.post-accordion') || accHead.parentElement;
      setOpen(acc, !acc.classList.contains('is-open'));
      return;
    }

    // select — option first, then the control, then "click outside closes"
    var opt = closest(t, '.post-select__option');
    if (opt) {
      var sel = closest(opt, '.post-select');
      var value = sel.querySelector('[data-post-value]');
      var multi = sel.hasAttribute('data-post-multi');
      if (multi) {
        var picked = opt.getAttribute('aria-selected') === 'true';
        opt.setAttribute('aria-selected', picked ? 'false' : 'true');
        var n = sel.querySelectorAll('[aria-selected="true"]').length;
        // The display rule: multi shows a COUNT, not a list of chosen items.
        if (value) value.textContent = n ? n + ' selected' : value.getAttribute('data-post-placeholder') || 'Select';
        return; // multi stays open — picking several should not cost several clicks
      }
      var all = sel.querySelectorAll('.post-select__option');
      for (var j = 0; j < all.length; j++) all[j].setAttribute('aria-selected', 'false');
      opt.setAttribute('aria-selected', 'true');
      if (value) value.textContent = opt.textContent.trim();
      setOpen(sel, false);
      return;
    }
    var selCtl = closest(t, '[data-post-select]');
    if (selCtl) {
      var s = closest(selCtl, '.post-select');
      if (s && !s.classList.contains('is-disabled')) setOpen(s, !s.classList.contains('is-open'));
      return;
    }

    // level filter
    var lvl = closest(t, '[data-post-levelfilter]');
    if (lvl) {
      var lf = closest(lvl, '.post-levelfilter');
      setOpen(lf, !lf.classList.contains('is-open'));
      return;
    }

    // search submit — the magnifier is a real button, not decoration
    var submit = closest(t, '[data-post-search]');
    if (submit) {
      var sBar = closest(submit, '.post-search');
      var sInput = sBar && sBar.querySelector('input');
      if (sInput) {
        // No opinion on WHAT search means — that is the page's job. Fire a bubbling
        // custom event carrying the term and let the consumer (Webflow interaction,
        // React handler, form submit) decide. An empty term is not a search: focus the
        // field instead, which is what a user clicking a magnifier on an empty bar wants.
        if (!sInput.value) { sInput.focus(); return; }
        sBar.dispatchEvent(new CustomEvent('post:search', {
          bubbles: true, detail: { value: sInput.value }
        }));
        // If the bar sits in a real <form>, submitting is the no-JS-consumer default.
        var form = closest(sBar, 'form');
        if (form && typeof form.requestSubmit === 'function') form.requestSubmit();
      }
      return;
    }

    // search clear — a real ghost icon button, not the UA's native x
    var clear = closest(t, '[data-post-clear]');
    if (clear) {
      var searchEl = closest(clear, '.post-search');
      var field = searchEl && searchEl.querySelector('input');
      if (field) {
        field.value = '';
        searchEl.classList.remove('is-filled');
        // Focus back to the field: clearing is a step in typing, not the end of it.
        field.focus();
      }
      return;
    }

    // scroll dots
    var dot = closest(t, '[data-post-dots] .post-dots__dot');
    if (dot) {
      var dots = closest(dot, '[data-post-dots]').querySelectorAll('.post-dots__dot');
      for (var k = 0; k < dots.length; k++) dots[k].classList.toggle('is-active', dots[k] === dot);
      return;
    }

    // click outside any open select/level filter closes it
    var open = doc.querySelectorAll('.post-select.is-open, .post-levelfilter.is-open');
    for (var m = 0; m < open.length; m++) {
      if (!open[m].contains(t)) setOpen(open[m], false);
    }
  });

  // ---- change: classes follow the REAL input for label-wrapped controls ------
  // Checkbox and Radio wrap a visually-hidden native input, which is what gives them
  // keyboard support, form submission and assistive-tech semantics for free. So the
  // input owns the state and this only mirrors it onto the class the CSS reads.
  doc.addEventListener('change', function (e) {
    var input = e.target;
    if (!input || !input.matches) return;

    var host = closest(input, '[data-post-toggle="check"]');
    if (host && input.type === 'checkbox') {
      host.classList.toggle('is-checked', input.checked);
      host.setAttribute('aria-checked', input.checked ? 'true' : 'false');
      return;
    }

    var rhost = closest(input, '[data-post-radio]');
    if (rhost && input.type === 'radio') {
      // Native grouping (shared `name`) already moved the selection; read every peer
      // back off its own input rather than assuming which one was clicked.
      var peers = doc.querySelectorAll('[data-post-radio="' + rhost.getAttribute('data-post-radio') + '"]');
      for (var i = 0; i < peers.length; i++) {
        var pin = peers[i].querySelector('input');
        var on = !!(pin && pin.checked);
        peers[i].classList.toggle('is-selected', on);
        peers[i].setAttribute('aria-checked', on ? 'true' : 'false');
      }
    }
  });

  // ---- input: the search field's filled/empty state -------------------------
  // Delegated on `input` (which does not bubble in old IE but does everywhere this
  // ships) so a search bar added to the DOM later still works with no re-init.
  doc.addEventListener('input', function (e) {
    var field = e.target;
    if (!field.matches || !field.matches('.post-search input')) return;
    var searchEl = closest(field, '.post-search');
    if (searchEl) searchEl.classList.toggle('is-filled', field.value.length > 0);
  });

  // ---- keyboard -------------------------------------------------------------
  // Space/Enter on a div-based control must behave like a button. Anything using a
  // real <button> already does; this covers the label-wrapped patterns.
  doc.addEventListener('keydown', function (e) {
    if (e.key !== ' ' && e.key !== 'Enter') {
      if (e.key === 'Escape') {
        var open = doc.querySelectorAll('.post-select.is-open, .post-levelfilter.is-open');
        for (var i = 0; i < open.length; i++) setOpen(open[i], false);
        // Chrome clears type="search" on Escape natively but does not always fire an
        // `input` event for it, which would leave is-filled stale and the clear button
        // showing over an empty field. Own the whole interaction rather than half of it.
        var sf = closest(e.target, '.post-search');
        if (sf) {
          var sfield = sf.querySelector('input');
          if (sfield) { sfield.value = ''; sf.classList.remove('is-filled'); }
        }
      }
      return;
    }
    // Enter in the search field means exactly what clicking the magnifier means. Route it
    // through the button so there is one submit path, not two that can drift.
    if (e.key === 'Enter' && e.target.matches && e.target.matches('.post-search input')) {
      var sbar = closest(e.target, '.post-search');
      var sbtn = sbar && sbar.querySelector('[data-post-search]');
      if (sbtn) { e.preventDefault(); sbtn.click(); }
      return;
    }
    var el = closest(e.target, '[data-post-toggle],[data-post-radio],[data-post-accordion]');
    if (el && el.tagName !== 'BUTTON' && el.tagName !== 'INPUT') {
      e.preventDefault();
      el.click();
    }
  });
})();
