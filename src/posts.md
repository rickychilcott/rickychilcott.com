---
layout: page
title: Posts
---

<% collections.posts.resources.each do |post| %>
  <% body = if (abstract = post.data.abstract).present?
      abstract
    else
      post.content
    end %>

  <%= render Article.new(title: post.data.title,
                         date: post.data.date,
                         url: post.absolute_url,
                         body: Truncato.truncate(body, max_length: 250).html_safe) %>
<% end %>
