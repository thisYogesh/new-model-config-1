import { Component } from '@theme/component';
import { morph } from '@theme/morph';
import { StandardEvents } from '@shopify/events';

/**
 * @typedef {object} PurchaseOptionsRefs
 * @property {HTMLInputElement[]} [optionInputs] - The subscribe / one-time radio inputs.
 * @property {HTMLSelectElement} [frequencySelect] - The delivery frequency dropdown.
 */

/**
 * Subscribe & Save / One Time Purchase selector.
 *
 * Keeps a hidden `selling_plan` input in sync inside the sibling buy-buttons product form
 * (`product-form-component form`) so the theme's native add-to-cart submits the subscription.
 *
 * @extends Component<PurchaseOptionsRefs>
 */
class PurchaseOptionsComponent extends Component {
  #abortController = new AbortController();

  connectedCallback() {
    super.connectedCallback();

    const { signal } = this.#abortController;
    const target = this.closest('.shopify-section, dialog');
    target?.addEventListener(StandardEvents.productSelect, this.#onProductSelect, { signal });

    this.#syncSellingPlan();
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    this.#abortController.abort();
    this.#removeSellingPlanInput();
  }

  /**
   * Handles radio / frequency changes (bound declaratively via `on:change="/handleChange"`).
   */
  handleChange() {
    this.#syncSellingPlan();

    this.dispatchEvent(
      new CustomEvent('purchase-options:change', {
        bubbles: true,
        detail: {
          selection: this.selection,
          sellingPlanId: this.selectedSellingPlanId,
        },
      })
    );
  }

  /**
   * @returns {'subscribe' | 'one_time'} The currently selected purchase option.
   */
  get selection() {
    const checked = this.refs.optionInputs?.find((input) => input.checked);
    return checked?.value === 'subscribe' ? 'subscribe' : 'one_time';
  }

  /**
   * @returns {string} The selling plan id to submit, or an empty string for a one-time purchase.
   */
  get selectedSellingPlanId() {
    if (this.selection !== 'subscribe') return '';

    const { frequencySelect } = this.refs;
    if (frequencySelect instanceof HTMLSelectElement && frequencySelect.value) {
      return frequencySelect.value;
    }

    const checked = this.refs.optionInputs?.find((input) => input.checked);
    return checked?.dataset.sellingPlanId ?? '';
  }

  /**
   * @returns {HTMLFormElement | null} The sibling buy-buttons product form.
   */
  get #productForm() {
    const details = this.closest('.product-details');
    const form = details?.querySelector('product-form-component form');
    return form instanceof HTMLFormElement ? form : null;
  }

  /**
   * Adds, updates or removes the hidden `selling_plan` input in the product form.
   */
  #syncSellingPlan() {
    const form = this.#productForm;
    if (!form) return;

    const sellingPlanId = this.selectedSellingPlanId;

    if (!sellingPlanId) {
      this.#removeSellingPlanInput();
      return;
    }

    let input = form.querySelector('input[name="selling_plan"]');

    if (!(input instanceof HTMLInputElement)) {
      input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'selling_plan';
      input.dataset.purchaseOptions = 'true';
      form.append(input);
    }

    input.value = sellingPlanId;
  }

  #removeSellingPlanInput() {
    const form = this.#productForm;
    const input = form?.querySelector('input[name="selling_plan"][data-purchase-options="true"]');
    input?.remove();
  }

  /**
   * Re-renders this block from the section HTML fetched on variant change so subscription
   * prices/plans stay in sync, then re-applies the hidden input.
   *
   * @param {Event & { promise?: Promise<any> }} event
   */
  #onProductSelect = async (event) => {
    if (!event.promise) return;

    try {
      const { detail } = await event.promise;
      const html = detail?.html;
      if (!html) return;

      const selector = `purchase-options-component[data-block-id="${this.dataset.blockId}"]`;
      const next = html.querySelector(selector);

      if (next) {
        const selection = this.selection;
        const frequency = this.refs.frequencySelect?.value;

        morph(this, next);

        for (const input of this.refs.optionInputs ?? []) {
          input.checked = input.value === selection;
        }

        const { frequencySelect } = this.refs;
        if (frequencySelect instanceof HTMLSelectElement && frequency) {
          const hasOption = Array.from(frequencySelect.options).some((option) => option.value === frequency);
          if (hasOption) frequencySelect.value = frequency;
        }
      }

      this.#syncSellingPlan();
    } catch {
      // Aborted or failed variant fetch — keep the current state.
    }
  };
}

if (!customElements.get('purchase-options-component')) {
  customElements.define('purchase-options-component', PurchaseOptionsComponent);
}
