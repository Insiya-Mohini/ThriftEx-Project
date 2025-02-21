document.addEventListener("DOMContentLoaded", () => {
  // Extract the product ID from the query string
  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id");

  if (!productId) {
    // Redirect or display an error message if no ID is present
    document.getElementById("product-container").innerHTML =
      "<p>Invalid product ID.</p>";
    return;
  }

  // Fetch product details by ID
  fetch(`http://localhost:3000/api/products/${productId}`)
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        const product = data.data;

        // Dynamically fill in product details
        document.getElementById("product-title").textContent = product.title;
        document.getElementById("product-price").textContent = `₹${product.price}`;
        document.getElementById("product-condition").textContent = product.condition1;
        document.getElementById("product-description").textContent = product.description;

        // Populate additional product details
        document.getElementById("product-size").textContent = product.size || "N/A";
        document.getElementById("product-gender").textContent = product.gender || "N/A";
        document.getElementById("product-material").textContent = product.material || "N/A";

        // Set product images
        document.getElementById("product-image").src = product.image_url;
        if (product.image_url) {
          document.getElementById("product-image").alt = product.title;
        }

      } else {
        document.getElementById("product-container").innerHTML =
          "<p>Product not found.</p>";
      }
    })
    .catch((error) => {
      console.error("Error fetching product details:", error);
      document.getElementById("product-container").innerHTML =
        "<p>An error occurred while fetching the product details.</p>";
    });
});
