---
layout: page
title: Posts
---

<% collections.posts.resources.each do |post| %>
<% next if !!(post.data.hidden.to_s == "true") %>
<% body = post.data.abstract.present? ? post.data.abstract : post.content %>

<%= render Article.new(title: post.data.title, date: post.data.date, url: post.absolute_url, body: Truncato.truncate(body, max_length: 250).html_safe) %>
<% end %>
