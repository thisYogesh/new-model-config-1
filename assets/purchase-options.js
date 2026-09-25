import { Component } from '@theme/component';

/**
 * @typedef {object} PurchaseOptionsRefs
 * @property {HTMLInputElement} [sellingPlanInput] - Hidden input carrying the selling plan id.
 * @property {HTMLInputElement} [subscribeRadio] - Radio for the subscription option.
 * @property {HTMLInputElement} [oneTimeRadio] - Radio for the one time purchase option.
 * @property {HTMLSelectElement} [frequencySelect] - Delivery frequency select.
 */

/**
 * Toggles between a subscription selling plan and a one time purchase.
 *
 * Writes the chosen selling plan id into a hidden input that is associated with the
 * buy buttons form through the `form` attribute, so the value is submitted with the
 * regular add to cart request.
 *
 * @extends {Component<PurchaseOptionsRefs>}
 */
class PurchaseOptions extends Component {
  connectedCallback() {
    super.connectedCallback();

    if (this.dataset.selected === 'one-time') {
      this.selectOneTime();
    } else {
      this.selectSubscribe();
    }
  }

  /**
   * Selects the subscription option and applies the currently chosen frequency.
   */
  selectSubscribe() {
    const { frequencySelect, subscribeRadio } = this.refs;

    if (subscribeRadio) subscribeRadio.checked = true;

    this.dataset.selected = 'subscribe';
    this.#setSellingPlan(frequencySelect?.value ?? '');
  }

  /**
   * Selects the one time purchase option and clears the selling plan.
   */
  selectOneTime() {
    const { oneTimeRadio } = this.refs;

    if (oneTimeRadio) oneTimeRadio.checked = true;

    this.dataset.selected = 'one-time';
    this.#setSellingPlan('');
  }

  /**
   * Applies a newly picked delivery frequency when the subscription option is active.
   */
  changeFrequency() {
    if (this.dataset.selected !== 'subscribe') {
      this.selectSubscribe();
      return;
    }

    this.#setSellingPlan(this.refs.frequencySelect?.value ?? '');
  }

  /**
   * Writes the selling plan id to the hidden input and notifies listeners.
   *
   * @param {string} sellingPlanId - The selling plan id, or an empty string for one time purchases.
   */
  #setSellingPlan(sellingPlanId) {
    const { sellingPlanInput } = this.refs;

    if (sellingPlanInput) sellingPlanInput.value = sellingPlanId;

    this.dispatchEvent(
      new CustomEvent('purchase-options:change', {
        bubbles: true,
        detail: { sellingPlanId },
      })
    );
  }
}

if (!customElements.get('purchase-options')) {
  customElements.define('purchase-options', PurchaseOptions);
}
