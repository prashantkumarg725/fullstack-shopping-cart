package main

import (
	"github.com/gin-gonic/gin"
	"strconv"
)

type User struct {
	ID       int
	Username string
	Password string
}

type Product struct {
	ID    int
	Name  string
	Price int
}

type CartItem struct {
	Product  Product
	Quantity int
}

type Order struct {
	ID    int
	Items []CartItem
	Total int
}

var users []User
var products = []Product{
	{ID: 1, Name: "T-shirt", Price: 399},
	{ID: 2, Name: "Jeans", Price: 1299},
	{ID: 3, Name: "Sneakers", Price: 2499},
}

var cart = []CartItem{}
var orders = []Order{}

func main() {
	r := gin.Default()

	// serve frontend
	r.Static("/static", "./static")

	// ----- USERS -----
	r.POST("/users", func(c *gin.Context) {
		var body map[string]string
		if err := c.BindJSON(&body); err != nil {
			c.JSON(400, gin.H{"error": "invalid body"})
			return
		}

		newUser := User{
			ID:       len(users) + 1,
			Username: body["username"],
			Password: body["password"],
		}

		users = append(users, newUser)
		c.JSON(200, gin.H{"message": "user created", "user": newUser})
	})

	r.POST("/users/login", func(c *gin.Context) {
		var body map[string]string
		if err := c.BindJSON(&body); err != nil {
			c.JSON(400, gin.H{"error": "invalid"})
			return
		}

		for _, u := range users {
			if u.Username == body["username"] && u.Password == body["password"] {
				c.JSON(200, gin.H{"token": "dummy-token-" + strconv.Itoa(u.ID)})
				return
			}
		}
		c.JSON(401, gin.H{"error": "invalid credentials"})
	})

	// ----- PRODUCTS -----
	r.GET("/products", func(c *gin.Context) {
		c.JSON(200, products)
	})

	// ----- CART -----
	r.POST("/cart/add", func(c *gin.Context) {
		var body map[string]int
		if err := c.BindJSON(&body); err != nil {
			c.JSON(400, gin.H{"error": "invalid"})
			return
		}

		// find product
		for _, p := range products {
			if p.ID == body["product_id"] {
				cart = append(cart, CartItem{
					Product:  p,
					Quantity: body["quantity"],
				})
				c.JSON(200, gin.H{"message": "added"})
				return
			}
		}
		c.JSON(404, gin.H{"error": "product not found"})
	})

	r.GET("/cart", func(c *gin.Context) {
		total := 0
		for _, item := range cart {
			total += item.Product.Price * item.Quantity
		}
		c.JSON(200, gin.H{"items": cart, "total": total})
	})

	r.DELETE("/cart/remove/:id", func(c *gin.Context) {
		idStr := c.Param("id")
		id, _ := strconv.Atoi(idStr)

		if id <= 0 || id > len(cart) {
			c.JSON(404, gin.H{"error": "invalid id"})
			return
		}

		cart = append(cart[:id-1], cart[id:]...)
		c.JSON(200, gin.H{"message": "removed"})
	})

	// ----- ORDERS -----
	r.POST("/orders", func(c *gin.Context) {
		total := 0
		for _, item := range cart {
			total += item.Product.Price * item.Quantity
		}

		newOrder := Order{
			ID:    len(orders) + 1,
			Items: cart,
			Total: total,
		}

		orders = append(orders, newOrder)
		cart = []CartItem{} // empty cart after order

		c.JSON(200, gin.H{"order": newOrder})
	})

	r.GET("/orders", func(c *gin.Context) {
		c.JSON(200, orders)
	})

	r.Run(":8080")
}

