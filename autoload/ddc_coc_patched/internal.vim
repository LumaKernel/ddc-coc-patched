function! ddc_coc_patched#internal#callback(items, id) abort
  call ddc#callback(a:id, a:items)
endfunction
