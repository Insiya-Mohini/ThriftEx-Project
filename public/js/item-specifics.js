// public/js/item-specifics.js
const itemSpecifications = {
    clothing: {
        brand: ["Nike", "Adidas", "Gucci", "Unbranded"],
        sizeType: ["Regular", "Plus", "Petites", "Tall", "Maternity"],
        size: ["XS", "S", "M", "L", "XL", "XXL"],
        color: ["Black", "White", "Red", "Blue", "Green", "Brown"],
        style: ["Casual", "Formal", "Sportswear"],
        department: ["Women", "Men", "Unisex", "Kids"]
    },
    accessories: {
        brand: ["Rolex", "Seiko", "Unbranded", "Fossil"],
        material: ["Gold", "Silver", "Plastic", "Leather"],
        color: ["Black", "White", "Gold", "Silver"],
        type: ["Watches", "Jewelry", "Sunglasses", "Bags"]
    }
};

// Function to get specifications by category
function getSpecifications(category) {
    return itemSpecifications[category.toLowerCase()] || {};
}
