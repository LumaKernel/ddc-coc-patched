function! ddc_coc_patched#internal#callback(items, alias) abort
  let g:ddc_coc_patched#internal#items#{a:alias} = a:items
  call ddc#refresh_candidates()
endfunction
