// Handle sorting functionality
document.getElementById("sortBy").addEventListener("change", function () {
  const sortOption = this.value;
  fetchAndRenderProducts({ sortBy: sortOption });
});

// Open and close filter side window
document.getElementById("filter-button").addEventListener("click", function () {
  document.getElementById("filterWindow").classList.add("active");
});

document
  .getElementById("closeFilterWindow")
  .addEventListener("click", function () {
    document.getElementById("filterWindow").classList.remove("active");
  });

// Handle filter apply button
document.getElementById("apply-filters").addEventListener("click", function () {
  const selectedCategories = Array.from(
    document.querySelectorAll('input[name="category"]:checked')
  ).map((input) => input.value);

  const selectedConditions = Array.from(
    document.querySelectorAll('input[name="condition"]:checked')
  ).map((input) => input.value);

  const selectedGender = Array.from(
    document.querySelectorAll('input[name="gender"]:checked')
  ).map((input) => input.value);

  // Fetch and render products based on filters
  fetchAndRenderProducts({
    category: selectedCategories.join(","),
    condition: selectedConditions.join(","),
    gender: selectedGender.join(","),
  });

  // Close the filter window after applying filters
  document.getElementById("filterWindow").classList.remove("active");
});

// Function to fetch and render products
function fetchAndRenderProducts({
  sortBy = "createdAt",
  category = "",
  condition = "",
  gender = "",
} = {}) {
  const queryParams = new URLSearchParams({
    sortBy,
    category,
    condition,
    gender,
  }).toString();

  fetch(`http://localhost:3000/api/products?${queryParams}`)
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        const products = data.data;
        const productList = document.getElementById("product-list");

        // Clear existing products
        productList.innerHTML = "";

        products.forEach((product) => {
          const productHTML = `
            <div class="col-lg-3 col-12 mb-3">
              <div class="product-thumb" data-id="${product.id}">
                <a href="product-detail.html?id=${product.id}">
                  <img src="${product.image_url}" class="img-fluid product-image" alt="${product.title}">
                </a>
                <div class="product-top d-flex">
                  <span class="product-alert me-auto">${product.condition1}</span>
                  <a href="wishlist-test.html" class="bi-heart-fill product-icon"></a>
                </div>
                <div class="product-info d-flex">
                  <div>
                    <h5 class="product-title mb-0">
                      <a href="product-detail.html?id=${product.id}" class="product-title-link">${product.title}</a>
                    </h5>
                  </div>
                  <small class="product-price text-muted ms-auto">₹${product.price}</small>
                </div>
              </div>
            </div>
          `;
          productList.innerHTML += productHTML;
        });
      }
    })
    .catch((error) => {
      console.error("Error fetching products:", error);
    });
}

// Initial product load (default sorting and no filters)
document.addEventListener("DOMContentLoaded", function () {
  fetchAndRenderProducts();
});