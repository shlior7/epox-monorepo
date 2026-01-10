<?php
/**
 * Enqueue script and styles for child theme
 */
function woodmart_child_enqueue_styles() {
	wp_enqueue_style( 'child-style', get_stylesheet_directory_uri() . '/style.css', array( 'woodmart-style' ), woodmart_get_theme_info( 'Version' ) );
}
add_action( 'wp_enqueue_scripts', 'woodmart_child_enqueue_styles', 10010 );

function s2g_woo_variations_limit( $limit ) {
	$limit = 200;

	return $limit;
}
add_filter( 'woocommerce_rest_batch_items_limit',  's2g_woo_variations_limit' );







//add attributes hierercy  ******************************* צבעים חלקוה לשורות ************************


/**
 * Output radio buttons on WooCommerce variations.
 */
add_filter('woocommerce_dropdown_variation_attribute_options_html', 'platot_variation_initalize', 20, 2);
		   
		   
function platot_variation_initalize($html, $args) {
	
	if($args['attribute'] !== 'pa_צבע-פלטה')
		return $html;

    /** @var array $args */
    
	/*
     if(current_user_can( 'administrator' ))
	 {
		print_r($args['product']);
	 }
	*/
	
    $args = wp_parse_args(apply_filters('woocommerce_dropdown_variation_attribute_options_args', $args), [
        'options'          => false,
        'attribute'        => false,
        'product'          => false,
        'selected'         => false,
        'name'             => '',
        'id'               => '',
        'class'            => '',
        'show_option_none' => __('Choose an option', 'woocommerce'),
    ]);

    /** @var WC_Product_Variable $product */
    $options          = $args['options'];
    $product          = $args['product'];
    $attribute        = $args['attribute'];
    $name             = $args['name'] ?: 'attribute_'.sanitize_title($attribute);
    $id               = $args['id'] ?: sanitize_title($attribute);
    $class            = $args['class'];
    $show_option_none = (bool)$args['show_option_none'];
    // We'll do our best to hide the placeholder, but we'll need to show something when resetting options.
    $show_option_none_text = $args['show_option_none'] ?: __('Choose an option', 'woocommerce');

    // Get selected value.
    if ($attribute && $product instanceof WC_Product && $args['selected'] === false) {
        $selected_key     = 'attribute_'.sanitize_title($attribute);
        $args['selected'] = isset($_REQUEST[$selected_key]) ? wc_clean(wp_unslash($_REQUEST[$selected_key]))
            : $product->get_variation_default_attribute($attribute); // WPCS: input var ok, CSRF ok, sanitization ok.
    }
	
	
	
	
    if (empty($options) && ! empty($product) && ! empty($attribute)) {
        $attributes = $product->get_variation_attributes();
        $options    = $attributes[$attribute];
    }
	
	
	
    if ( ! empty($options)) {
        if ($product && taxonomy_exists($attribute)) {
			

            $terms = wc_get_product_terms($product->get_id(), $attribute, ['fields' => 'all']);
            
            $all_color = array();

            $field = get_field_object('field_647d08b249981');

            $choices = $field['choices'];
						
			
            foreach ($terms as $term) {

				$color_type = get_field( 'type','term_'.$term->term_id );		
				
                if (in_array($color_type['label'],$choices)) {

                    $all_color[ $color_type['label'] ] [] = $term;
                }
                  
            }
			
			$isIt1980Egger = has_term(346, 'product_tag', $product_id);
			 
            if(!empty($all_color))
            {
				
            	
                foreach ($all_color as $key => $color_data) {

					//TODO MAKE IT MORE EFFICIENT - This statment is for the 3 enginges products where egger price is 1980 instead of 490
					if($isIt1980Egger){
						switch($key)
						{
							case 'פורמייקה של אגר (בתוספת 490 ש"ח)':
								$key = 'פורמייקה של אגר (בתוספת 1980 ש"ח - 2 פלטות)';
								break;

								
							case 'פלטה ננו (בתוספת 990 ש"ח)':
								$key = 'פלטה ננו (בתוספת 1980 ש"ח - 2 פלטות)';
       							 break;
								
						}
					}
						
					$radios .='<span class="colorLabelRow">'.$key.' : </span>';
					
                    

                    $radios .='<ul role="radiogroup" aria-label="image_color" class="variable-items-wrapper custom_variable color-variable-items-wrapper wvs-style-squared" data-attribute_name="attribute_pa_צבע-פלטה">';
					
					
                    foreach ($color_data as $term) {
                            $color_image_id = get_term_meta( $term->term_id, 'product_attribute_image', true);
                            $image_attributes = wp_get_attachment_image_src( $color_image_id );
                            //echo "<pre>"; print_r($image_attributes);
                            if (in_array($term->slug, $options, true)) {
                				
                                $radios .= '<li aria-checked="false" tabindex="0" data-wvstooltip="'.$term->name.'" class="variable-item image-variable-item image-variable-item-'.$term->slug.'" title="'.$term->name.'" data-title="'.$term->name.'" data-value="'.$term->slug.'" role="radio" data-wvstooltip-out-of-stock="">';       
								
                                $radios .= '<div class="variable-item-contents"><img class="variable-item-image" aria-hidden="true" alt="Black" src="'.$image_attributes[0].'" width="50" height="50"></span></div>';
                                $radios .= '</li>';
                                

                            }
                    }
                    $radios .='</ul>';
                }
            }
			
            
        } else {
            foreach ($options as $option) {

                $checked = sanitize_title($args['selected']) === $args['selected'] ? checked($args['selected'],
                    sanitize_title($option), false) : checked($args['selected'], $option, false);
                $radios  .= '<input type="radio" name="custom_'.esc_attr($name).'" data-value="'.esc_attr($option).'" id="'
                            .esc_attr($name).'_'.esc_attr($option).'" data-variation-name="'.esc_attr($name).'" '.$checked.'>';
                $radios  .= '<label for="'.esc_attr($name).'_'.esc_attr($option).'">';
                $radios  .= esc_html(apply_filters('woocommerce_variation_option_name', $option));
                $radios  .= '</label>';
            }
        }
    }

    

    return $html.$radios;

}

add_action('wp_footer','custom_main_js');

function custom_main_js()
{
?>

<script type="text/javascript">
    (function ($) {
   
		jQuery("select").change(function() {
			$('.custom_variable').each(function(){
				var $this = $(this);    
				setTimeout(function(){
					var liVals = $this.find('li').length;
					var disabledVals = $this.find('li.disabled').length;
					if(disabledVals == liVals){
						$this.prev('.colorLabelRow').hide();
					}else{
						$this.prev('.colorLabelRow').show();
					}
				},10);
			});
		});
		
})(jQuery);

</script>

<?php
}


//***************** סיום צבעים חלוקה לשורות **********************



// סידור קטגוריית כיסאות קומפורט לפי סדר תפריט ולא לפי מחיר כמו שאר האתר
// סידור קטגוריית כיסאות קומפורט לפי סדר תפריט ולא לפי מחיר כמו שאר האתר
function custom_woocommerce_default_sorting($orderby) {
    if (is_product_category(109)) {
        return 'menu_order';
    }
    return $orderby;
}
add_filter('woocommerce_default_catalog_orderby', 'custom_woocommerce_default_sorting', 10, 1);





// שאלון ארגונומי ריידירקט
add_action( 'elementor_pro/forms/new_record', function( $record, $handler ) {
    //make sure its our form
    $form_name = $record->get_form_settings( 'form_name' );

    // Replace MY_FORM_NAME with the name you gave your form
    if ( 'שאלון אבחון ארגונומי' !== $form_name ) {
        return;
    }
	
    $raw_fields = $record->get( 'fields' );
    $fields = [];
	
	$redirect_to = "https://ergonomicoffice.co.il/%d7%aa%d7%95%d7%a6%d7%90%d7%95%d7%aa-%d7%90%d7%91%d7%97%d7%95%d7%9f-%d7%94%d7%a8%d7%92%d7%9c%d7%99-%d7%a2%d7%91%d7%95%d7%93%d7%94-" . $raw_fields['body_type']['value'];

	
	$handler->add_response_data( 'redirect_url', $redirect_to );

}, 10, 2 );



// Save custom field data to order meta
add_action('woocommerce_checkout_update_order_meta', 'save_custom_checkout_fields');

function save_custom_checkout_fields($order_id) {
    if (!empty($_POST['elevator'])) {
        update_post_meta($order_id, '_elevator', sanitize_text_field($_POST['elevator']));
    }
    if (!empty($_POST['floor'])) {
        update_post_meta($order_id, '_floor', sanitize_text_field($_POST['floor']));
    }
}

// Display custom field data in the admin order details
add_action('woocommerce_admin_order_data_after_billing_address', 'display_custom_checkout_fields_in_admin', 10, 1);

function display_custom_checkout_fields_in_admin($order) {
    $elevator = get_post_meta($order->get_id(), '_elevator', true);
    $floor = get_post_meta($order->get_id(), '_floor', true);

    if ($elevator) {
        echo '<p><strong>Elevator:</strong> ' . esc_html($elevator) . '</p>';
    }
    if ($floor) {
        echo '<p><strong>Floor:</strong> ' . esc_html($floor) . '</p>';
    }
}


function custom_woocommerce_default_catalog_orderby( $sort_by ) {
    // Set the default sorting to 'price' (low to high)
    return 'price';
}
add_filter( 'woocommerce_default_catalog_orderby', 'custom_woocommerce_default_catalog_orderby' );

function custom_woocommerce_catalog_orderby( $orderby ) {
    // Ensure 'price' sorting is available
    $orderby['price'] = __('Sort by price: low to high', 'woocommerce');
    return $orderby;
}
add_filter( 'woocommerce_catalog_orderby', 'custom_woocommerce_catalog_orderby' );

///*********** My Code ***********

function custom_add_to_cart() {
    $product_id    = intval($_POST['product_id']);
    $variation_id  = intval($_POST['variation_id']);
    $quantity      = intval($_POST['quantity']);
    $attributes   = $_POST['attributes'];

    $added = WC()->cart->add_to_cart($product_id, $quantity, $variation_id);

    if ($added) {
        wp_send_json_success();
    } else {
        wp_send_json_error();
    }
}

add_action('wp_ajax_custom_add_to_cart', 'custom_add_to_cart');
add_action('wp_ajax_nopriv_custom_add_to_cart', 'custom_add_to_cart');
