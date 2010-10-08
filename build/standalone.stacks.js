
(function(exports){

  exports.stacks = {};

  exports.stacks.sync = function(func){
    return function(ctx, clb) {
      var new_ctx = func.call(this, ctx);
      clb(new_ctx);
    };
  };

  exports.stacks.serial = function(){
    var state = {};

    if ((arguments.length == 1) && (arguments[0] instanceof Array)) {
      state.steps = arguments[0];
    } else {
      state.steps = Array.prototype.slice.call(arguments, 0);
    }

    var perform_step, continue_chain;

    perform_step = function(step, rest, ctx, clb) {
      var _this = this;
      var _clb = function(_ctx){
        continue_chain.call(_this, rest, _ctx || ctx, clb);
      };
      _clb.pass = function(_ctx){
        if (clb || clb.pass) {
          clb.pass(_ctx || ctx);
        } else {
          continue_chain.call(_this, [], _ctx || ctx, clb);
        }
      };
      step.call(_this, ctx, _clb);
    };

    continue_chain = function(rest, ctx, clb) {
      if (rest.length == 0) {
        if (clb) { clb.call(this, ctx); }
      } else {
        perform_step.call(this, rest.shift(), rest, ctx, clb);
      }
    };

    var build;
    build = function(_state){
      var state = {steps:[]};
      for (i in _state.steps) { state.steps[i] = _state.steps[i]; }

      var serial = function(ctx, clb){
        var _steps = [], i;
        for (i in state.steps) { _steps.push(state.steps[i]); }
        continue_chain.call(this, _steps, ctx, clb);
      };

      serial.state = state;

      serial.toString = function(){
        return "serial:["+serial.state.steps.toString()+"]";
      };

      serial.push = function(step){
        var s = build(state);
        s.state.steps.push(step);
        return s;
      };

      return serial;
    };

    return build(state);
  };

  exports.stacks.parallel = function(){
    var steps;

    if ((arguments.length == 1) && (arguments[0] instanceof Array)) {
      steps = arguments[0];
    } else {
      steps = Array.prototype.slice.call(arguments, 0);
    }

    var emit_step = function(steps, step_id, ctx, clb){
      var _this = this;
      steps[step_id].call(_this, ctx, function(){
        delete steps[step_id];
        steps.length -= 1;

        if ((steps.length <= 0) && (clb)) {
          clb.call(_this, ctx, clb);
        }
      });
    };

    var emit_steps = function(steps, ctx, clb){
      var step, i;
      for(i in steps) {
        if (i != 'length')
          emit_step.call(this, steps, i, ctx, clb);
      }
    };

    return function(ctx, clb){
      var _steps = {}, i;
      _steps.length = steps.length;
      for (i in steps) { _steps[i] = steps[i]; }
      emit_steps.call(this, _steps, ctx, clb);
    };
  };

  exports.stacks.cascade = function(){
    var state = {};

    if ((arguments.length == 1) && (arguments[0] instanceof Array)) {
      state.stacks = arguments[0];
    } else {
      state.stacks = Array.prototype.slice.call(arguments, 0);
    }

    var perform_stack, continue_chain;

    perform_stack = function(stack, rest, ctx, clb) {
      var _this = this;
      var _clb = function(_ctx){
        continue_chain.call(_this, 'done', _ctx || ctx, clb);
      };
      _clb.pass = function(_ctx){
        continue_chain.call(_this, rest, _ctx || ctx, clb);
      };
      stack.call(_this, ctx, _clb);
    };

    continue_chain = function(rest, ctx, clb) {
      if (rest == 'done') {
        if (clb) { clb.call(this, ctx); }
      } else if (rest.length == 0) {
        if (clb && clb.pass) { clb.pass(ctx); }
      } else {
        perform_stack.call(this, rest.shift(), rest, ctx, clb);
      }
    };

    var build;
    build = function(_state){
      var state = {stacks:[]};
      for (i in _state.stacks) { state.stacks[i] = _state.stacks[i]; }

      var cascade = function(ctx, clb){
        var _stacks = [], i;
        for (i in state.stacks) { _stacks[i] = state.stacks[i]; }
        continue_chain.call(this, _stacks, ctx, clb);
      };

      cascade.state = state;

      cascade.toString = function(){
        return "cascade:["+cascade.state.stacks.toString()+"]";
      };

      cascade.push = function(stack, by_ref){
        if (by_ref) {
          state.stacks.push(stack);
          return this;
        } else {
          var c = build(state);
          c.state.stacks.push(stack);
          return c;
        }
      };

      return cascade;
    };

    return build(state);
  };

})(this);