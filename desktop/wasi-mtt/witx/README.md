
# Module: mtt_ephemeral_poll

## Table of contents

### Types list:

[**[All](#types)**] - [_[`size`](#size)_] - [_[`mtt_errno`](#mtt_errno)_] - [_[`userdata`](#userdata)_] - [_[`eventtype`](#eventtype)_] - [_[`subscription_window_event`](#subscription_window_event)_] - [_[`subscription_u`](#subscription_u)_] - [_[`subscription`](#subscription)_] - [_[`event_u`](#event_u)_] - [_[`event`](#event)_]

### Functions list:

[**[All](#functions)**] - [[`oneoff()`](#oneoff)]

## Types

### _[`size`](#size)_
Alias for `usize`.


> An array size.
> 
> Note: This is similar to `size_t` in POSIX.


---

### _[`mtt_errno`](#mtt_errno)_

Enumeration with tag type: `u16`, and the following members:

* **`success`**: _[`mtt_errno`](#mtt_errno)_
* **`ilseq`**: _[`mtt_errno`](#mtt_errno)_
* **`inval`**: _[`mtt_errno`](#mtt_errno)_
* **`overflow`**: _[`mtt_errno`](#mtt_errno)_
* **`io`**: _[`mtt_errno`](#mtt_errno)_
* **`fault`**: _[`mtt_errno`](#mtt_errno)_

> Error codes returned by functions.


---

### _[`userdata`](#userdata)_
Alias for `u64`.


> User-provided value that may be attached to objects that is retained when
> extracted from the implementation.


---

### _[`eventtype`](#eventtype)_

Enumeration with tag type: `u8`, and the following members:

* **`window_event`**: _[`eventtype`](#eventtype)_

> Type of a subscription to an event or its occurrence.


---

### _[`subscription_window_event`](#subscription_window_event)_
Structure, with the following members:

* **`event`**: `char8` mutable pointer
* **`event_len`**: _[`size`](#size)_

---

### _[`subscription_u`](#subscription_u)_
Tagged union with tag type: `u8` and the following possibilities:

* **`window_event`**: _[`subscription_window_event`](#subscription_window_event)_

> The contents of a `subscription`.


---

### _[`subscription`](#subscription)_
Structure, with the following members:

* **`u`**: _[`subscription_u`](#subscription_u)_

> Subscription to an event.


---

### _[`event_u`](#event_u)_

Enumeration with tag type: `u8`, and the following members:

* **`window_event`**: _[`event_u`](#event_u)_

> The contents of an `event`.


---

### _[`event`](#event)_
Structure, with the following members:

* **`error`**: _[`mtt_errno`](#mtt_errno)_
* **`u`**: _[`event_u`](#event_u)_

> An event that occurred.


---

## Functions

### [`oneoff()`](#oneoff)
Returned error type: _[`mtt_errno`](#mtt_errno)_

#### Input:

* **`in`**: _[`subscription`](#subscription)_ pointer
* **`nsubscriptions`**: _[`size`](#size)_

#### Output:

* _[`event`](#event)_ mutable pointer

> Concurrently poll for the occurrence of a set of events.
> 
> If `nsubscriptions` is 0, returns `errno::inval`.


---

