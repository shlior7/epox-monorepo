document.getElementById('custom-add-to-cart-button').addEventListener('click', function (e) {
  e.preventDefault();

  // Prepare the data to send in the AJAX request
  var data = new FormData();
  data.append('action', 'custom_add_to_cart');
  data.append('product_id', 27876);    // Replace with your product ID
  data.append('variation_id', 28376);  // Replace with your variation ID
  data.append('quantity', 1);

  // Send the AJAX POST request
  fetch('/wp-admin/admin-ajax.php', {
    method: 'POST',
    body: data
  })
    .then(response => response.json())
    .then(response => {
      if (response.success) {
        alert('Product added to cart.');
        jQuery(document.body).trigger('wc_fragment_refresh');

        // Optionally, update the cart contents or redirect the user
      } else {
        alert('Failed to add product to cart.');
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert('An error occurred.');
    });
});
