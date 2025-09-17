---
published: 2025-09-24
layout: post
title: Building Flexible DSLs in Ruby
tags:
  - ruby
  - dsl
  - metaprogramming
  - markdown
  - code-generation
abstract: Learn how to build flexible Domain Specific Languages in Ruby that accept content in multiple formats. Explore a real-world markdown generator that handles strings, blocks, and complex nesting patterns.
kind: technical
sitemap: true
---
Ruby's metaprogramming capabilities make it an excellent language for building Domain Specific Languages (DSLs). A well-designed DSL can make complex operations feel natural and intuitive, while providing flexibility for different use cases.

In this article, we'll explore how to build a flexible DSL by examining a markdown generator I created for a production application. This DSL demonstrates how to handle multiple input formats while maintaining clean, readable code.

## The Challenge: Generating Markdown Programmatically

The goal was to create a system that could generate markdown content that would later be converted to DocX format using Pandoc. The DSL needed to be flexible enough to handle different content patterns while remaining intuitive to use.

Here's what we wanted to achieve:

```ruby
class Example < Markdownable
  def template
    h1 do
      plain "Hello World"
    end

    p do
      plain "Lorem Ipsum is simply dummy text of the printing..."
    end

    p do
      strikethrough "strikethrough text"
      newline
      italic "italic text"
      newline
      bold "bold text"
      newline
      link_to "https://www.google.com", "Google"
    end
  end
end

puts Example.new
```

Which would output:

```markdown
# Hello World

Lorem Ipsum is simply dummy text of the printing...

~~strikethrough text~~
**italic text**
**bold text**
[Google](https://www.google.com)
```

## The Core DSL Implementation

Let's examine the key components that make this DSL flexible and powerful:

```ruby
class Markdownable
  def initialize
    @buffer = []
  end

  def template
    raise NotImplementedError, "Subclasses must implement #template"
  end

  def to_s
    @buffer = []
    template
    @buffer.join
  end

  # Block-level elements
  def h1(content = nil, &block)
    add_element("# ", content, &block)
  end

  def h2(content = nil, &block)
    add_element("## ", content, &block)
  end

  def p(content = nil, &block)
    add_element("", content, &block)
    newline
  end

  # Inline elements
  def bold(content = nil, &block)
    add_inline("**", "**", content, &block)
  end

  def italic(content = nil, &block)
    add_inline("__", "__", content, &block)
  end

  def strikethrough(content = nil, &block)
    add_inline("~~", "~~", content, &block)
  end

  def link_to(url, text = nil, &block)
    if block_given?
      text = capture_block(&block)
    end
    add_to_buffer("[#{text}](#{url})")
  end

  def plain(content = nil, &block)
    if block_given?
      content = capture_block(&block)
    end
    add_to_buffer(content.to_s) if content
  end

  def newline
    add_to_buffer("\n")
  end

  private

  def add_element(prefix, content = nil, &block)
    if block_given?
      content = capture_block(&block)
    end
    add_to_buffer("#{prefix}#{content}") if content
  end

  def add_inline(prefix, suffix, content = nil, &block)
    if block_given?
      content = capture_block(&block)
    end
    add_to_buffer("#{prefix}#{content}#{suffix}") if content
  end

  def capture_block(&block)
    original_buffer = @buffer
    @buffer = []
    instance_eval(&block)
    result = @buffer.join
    @buffer = original_buffer
    result
  end

  def add_to_buffer(content)
    @buffer << content
  end
end
```

## The Magic: Multiple Input Formats

The key to this DSL's flexibility is its ability to handle content in three different ways:

### 1. String Arguments

```ruby
bold("hello")
# Output: **hello**
```

### 2. Block with String Return

```ruby
bold do
  "hello"
end
# Output: **hello**
```

### 3. Block with DSL Methods

```ruby
bold do
  plain "hello"
end
# Output: **hello**
```

All three approaches produce the same result, giving developers maximum flexibility in how they structure their code.

## Advanced Features: Nested Structures

The DSL becomes even more powerful when handling complex nested structures:

```ruby
def unordered_list(items, &block)
  items.each do |item|
    add_to_buffer("- ")
    if block_given?
      # Pass the item to the block for custom formatting
      content = instance_exec(item, &block)
      add_to_buffer(content)
    else
      add_to_buffer(item.to_s)
    end
    newline
  end
end

# Usage
unordered_list([1, 2, 3]) do |item|
  plain "Item #{item}"
end
```

This pattern allows for sophisticated content generation while maintaining readability.

## The `capture_block` Method: The Heart of Flexibility

The `capture_block` method is what makes the multiple input formats possible:

```ruby
def capture_block(&block)
  original_buffer = @buffer
  @buffer = []
  instance_eval(&block)
  result = @buffer.join
  @buffer = original_buffer
  result
end
```

This method:

1. Saves the current buffer state
2. Creates a new buffer for the block's output
3. Executes the block in the current context
4. Captures the result
5. Restores the original buffer

This pattern allows blocks to generate content that can be used as arguments to other methods.

## Real-World Application: Document Generation

In the production application, this DSL was used to generate complex documents:

```ruby
class ProjectReport < Markdownable
  def initialize(project)
    @project = project
  end

  def template
    h1 { plain "Project Report: #{@project.name}" }

    h2 { plain "Overview" }
    p { plain @project.description }

    h2 { plain "Key Metrics" }
    unordered_list(@project.metrics) do |metric|
      bold { plain metric.name }
      plain ": #{metric.value}"
    end

    h2 { plain "Recommendations" }
    @project.recommendations.each do |rec|
      p do
        italic { plain "Priority: #{rec.priority}" }
        newline
        plain rec.description
      end
    end
  end
end
```

## Benefits of This Approach

### 1. Developer Experience

The DSL feels natural and intuitive, reducing cognitive load when generating content.

### 2. Flexibility

Multiple input formats accommodate different coding styles and use cases.

### 3. Extensibility

New methods can be added easily without breaking existing code.

### 4. Composability

Methods can be combined in various ways to create complex structures.

### 5. AI-Friendly

The consistent patterns make it easier for AI tools to generate correct code.

## Potential Challenges

### 1. Multiple Ways to Do Things

Having multiple input formats can confuse developers and AI tools about which approach to use.

### 2. Complex Implementation

The metaprogramming techniques require careful implementation and testing.

### 3. Debugging Difficulty

DSL code can be harder to debug than straightforward method calls.

### 4. Learning Curve

Team members need to understand the DSL patterns to use it effectively.

## Best Practices for DSL Design

### 1. Consistent Patterns

Ensure all methods follow the same input format conventions:

```ruby
def method_name(content = nil, &block)
  if block_given?
    content = capture_block(&block)
  end
  # Process content
end
```

### 2. Clear Documentation

Provide examples showing all supported input formats.

### 3. Error Handling

Include helpful error messages for common mistakes:

```ruby
def method_name(content = nil, &block)
  if content.nil? && !block_given?
    raise ArgumentError, "method_name requires either content or a block"
  end
  # ...
end
```

### 4. Testing

Test all input format combinations to ensure consistent behavior.

### 5. Performance Considerations

Be aware that `instance_eval` and block capture have performance implications for high-frequency operations.

## Alternative Approaches

### Method Chaining

```ruby
MarkdownBuilder.new
  .h1("Title")
  .p("Content")
  .to_s
```

### Builder Pattern

```ruby
MarkdownBuilder.build do |md|
  md.h1("Title")
  md.p("Content")
end
```

### Template-Based

```ruby
MarkdownTemplate.new("h1: {{title}}\np: {{content}}")
  .render(title: "Title", content: "Content")
```

## Conclusion

Building flexible DSLs in Ruby requires careful consideration of the developer experience, implementation complexity, and long-term maintainability. The markdown generator example demonstrates how to create a DSL that:

- Accepts multiple input formats
- Maintains consistent behavior
- Provides clear, readable code
- Supports complex nested structures

The key is to start with a clear understanding of your use cases and design the DSL to accommodate them naturally. While the implementation can be complex, the resulting developer experience often justifies the effort.

Remember that DSLs are tools to make complex operations feel simple. The best DSLs are those that developers can use intuitively without constantly referring to documentation, while still providing the power and flexibility needed for real-world applications.
