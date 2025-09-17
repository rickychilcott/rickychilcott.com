---
published: 2025-09-25
layout: post
title: The Evolution of Rails View Rendering
tags:
  - rails
  - views
  - erb
  - haml
  - viewcomponent
  - phlex
  - frontend
abstract: "A journey through Rails view rendering evolution: from ERB partials to HAML, ViewComponent, and finally Phlex. Learn the trade-offs and benefits of each approach with real-world examples."
kind: technical
sitemap: true
---
Rails view rendering has evolved significantly over the past 15 years. What started as simple ERB templates has grown into a sophisticated ecosystem of view rendering solutions, each addressing different pain points and use cases.

In this article, we'll trace this evolution through a practical example: rendering a product list. We'll see how each approach handles the same problem and understand the trade-offs involved.

## The Journey Begins: ERB Partials

In the early days of Rails, ERB (Embedded Ruby) was the standard templating engine. Views were built using partials that could be rendered with collections:

```erb
<%# app/views/products/index.html.erb %>
<%= render partial: "product", collection: @products, as: :product %>
<%# or even %>
<%= render @products %>

<%# app/views/products/_product.html.erb %>
<% cache ["v2", product, product.updated_at.to_i] do %>
  <article id="<%= dom_id(product) %>">
    <h3><%= product.name %></h3>
    <p><%= number_to_currency(product.price_cents / 100.0) %></p>
  </article>
<% end %>
```

**Pros:**

- Simple and straightforward
- Familiar HTML syntax
- Good performance with caching
- Easy for designers to understand

**Cons:**

- Verbose syntax with many `<%= %>` tags
- Limited reusability
- Partial lookup can be slow and magical
- Difficult to test view logic in isolation

## The HAML Revolution

HAML (HTML Abstraction Markup Language) was introduced to address ERB's verbosity:

```haml
-# app/views/products/index.html.haml
= render partial: "product", collection: @products, as: :product
-# or simply:
= render @products

-# app/views/products/_product.html.haml
- cache ["v2", product, product.updated_at.to_i] do
  %article{id: dom_id(product)}
    %h3= product.name
    %p= number_to_currency(product.price_cents / 100.0)
```

**Pros:**

- Much cleaner, more concise syntax
- Better for developers familiar with the format
- Reduced typing and visual clutter
- Good performance

**Cons:**

- Steep learning curve for designers and junior developers
- Indentation-sensitive (can be frustrating)
- Still suffers from partial lookup performance issues
- Less familiar to developers coming from other frameworks

## Enter ViewComponent

ViewComponent was created to address the limitations of partials by providing a more structured, testable approach:

```erb
<%# app/views/products/index.html.erb %>
<%= render ProductComponent.with_collection(@products) %>
```

```ruby
# app/components/product_component.rb
class ProductComponent < ViewComponent::Base
  def initialize(product:)
    @product = product
  end

  def call
    content_tag :article, id: dom_id(@product) do
      safe_join([
        content_tag(:h3, @product.name),
        content_tag(:p, number_to_currency(@product.price_cents / 100.0))
      ])
    end
  end
end
```

Or with ERB templates:

```erb
<%# app/components/product_component.html.erb %>
<% cache ["v2", @product, @product.updated_at.to_i] do %>
  <article id="<%= dom_id(@product) %>">
    <h3><%= @product.name %></h3>
    <p><%= number_to_currency(@product.price_cents / 100.0) %></p>
  </article>
<% end %>
```

**Pros:**

- Co-located view logic and templates
- Easy to test in isolation
- Better performance than partials
- Clear component boundaries
- Good for encapsulating complex view logic

**Cons:**

- `content_tag` usage can be verbose and hard to read
- Still requires template files for complex layouts
- Mixing Ruby and HTML can feel awkward
- Additional complexity for simple components

## The Phlex Approach

Phlex takes the ViewComponent concept further by keeping everything in Ruby:

```ruby
# app/components/views/product.rb
class Views::Product < Phlex::HTML
  include Rails.application.routes.url_helpers
  include ActionView::Helpers::NumberHelper
  include ActionView::RecordIdentifier # for dom_id

  def initialize(product:)
    @product = product
  end

  def view_template
    article(id: dom_id(@product)) do
      h3 { @product.name }
      p  { number_to_currency(@product.price_cents / 100.0) }
    end
  end
end

# app/components/views/products.rb
class Views::Products < Phlex::HTML
  def initialize(products:)
    @products = products
  end

  def view_template
    if @products.blank?
      render empty_products
    else
      @products.each do |product|
        render Views::Product.new(product:)
      end
    end
  end

  private

  def empty_products
    section(class: "empty") do
      h3 { "No products found" }
      p  { "Try adjusting your filters or adding a product." }
    end
  end
end
```

```erb
<%# app/views/products/index.html.erb %>
<%= render Views::Products.new(products: @products) %>
```

**Pros:**

- Everything in Ruby - no template parsing
- Excellent performance
- Great composability
- Easy to test
- Consistent with Rails' "convention over configuration"
- Good for AI code generation once patterns are established

**Cons:**

- Steep learning curve
- Less familiar to designers and junior developers
- Can feel verbose for simple components
- Requires understanding of Ruby metaprogramming concepts

## Performance Comparison

Let's look at the performance characteristics of each approach:

| Approach      | Parse Time | Render Time | Memory Usage | Bundle Size |
| ------------- | ---------- | ----------- | ------------ | ----------- |
| ERB Partials  | Medium     | Fast        | Low          | Small       |
| HAML          | Medium     | Fast        | Low          | Small       |
| ViewComponent | Low        | Fast        | Medium       | Medium      |
| Phlex         | None       | Fastest     | Low          | Small       |

## When to Use Each Approach

### Use ERB When:

- You have a small, simple application
- Your team includes designers who need to modify templates
- You want the most familiar and well-documented approach
- Performance is not a critical concern

### Use HAML When:

- Your team is comfortable with the syntax
- You want cleaner, more concise templates
- You're building a developer-focused application
- You don't mind the learning curve

### Use ViewComponent When:

- You need to test view logic in isolation
- You want better performance than partials
- You're building a component-based architecture
- You need to encapsulate complex view logic

### Use Phlex When:

- Performance is critical
- Your team is comfortable with Ruby metaprogramming
- You want maximum composability and reusability
- You're building a large, complex application

## Migration Strategies

### From ERB to ViewComponent

1. Start with your most complex partials
2. Extract view logic into component methods
3. Add tests for the new components
4. Gradually migrate simpler partials

### From ViewComponent to Phlex

1. Start with simple components that don't use complex ERB features
2. Convert the Ruby logic first, then the templates
3. Use Phlex's migration tools if available
4. Test thoroughly as the syntax is quite different

## Best Practices for Any Approach

### 1. Keep Components Small and Focused

Regardless of your chosen approach, keep components focused on a single responsibility.

### 2. Use Consistent Naming Conventions

Establish clear naming patterns for your components and partials.

### 3. Test Your Views

Write tests for your view logic, especially for complex components.

### 4. Consider Performance

Profile your view rendering performance and optimize where necessary.

### 5. Document Your Patterns

Create style guides and examples for your team to follow.

## The Future of Rails Views

The Rails ecosystem continues to evolve. Recent developments include:

- **Hotwire**: Bringing modern interactivity to server-rendered views
- **ViewComponent**: Continued improvements and ecosystem growth
- **Phlex**: Growing adoption and community support
- **Stimulus**: Enhanced JavaScript integration

## Conclusion

The evolution of Rails view rendering reflects the framework's commitment to developer productivity and application performance. Each approach has its place:

- **ERB** remains the most accessible and familiar
- **HAML** offers a cleaner syntax for those who prefer it
- **ViewComponent** provides better structure and testability
- **Phlex** delivers maximum performance and composability

The key is to choose an approach that fits your team's skills, project requirements, and long-term goals. Start simple and evolve your view rendering strategy as your application grows and your team's needs change.

Remember that the best view rendering approach is the one that your team can use effectively and maintain over time. Don't let the latest trends drive your decision - focus on what works best for your specific context.
