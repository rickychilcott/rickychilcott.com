---
layout: page
title: Posts
description: Blog posts by Ricky Chilcott on Ruby, Rails, web development, and running a software business.
---

<% collections.posts.resources.each do |post| %>
<% next if !!post.data.hidden %>
<% body = post.data.abstract.to_s.empty? ? post.content : post.data.abstract %>

<%= render Article.new(title: post.data.title, date: post.data.date, url: post.relative_url, body: Truncato.truncate(body, max_length: 250).html_safe, word_count: post.content.split.size) %>
<% end %>
